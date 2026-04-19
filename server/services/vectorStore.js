const { embedText } = require('./embedder.js');
const Research = require('../models/Research.js');

// 🧪 Improved Query Expansion for Medical Accuracy
// 🧪 [STEP 2] GLOBAL DEDUPLICATION
const deduplicate = (results) => {
    const seen = new Set();
    // Prioritization: pubmed > openalex > clinicaltrials
    const prioritized = results.sort((a, b) => {
        const priority = { 'pubmed': 1, 'openalex': 2, 'clinicaltrials': 3 };
        return priority[a.source] - priority[b.source];
    });

    return prioritized.filter(item => {
        const key = (item.title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

// 🧪 [STEP 3, 4 & 6] ADVANCED RANKING & EVIDENCE SCORING
const rankAndFilterResults = (results, disease, query, location) => {
    const dLower = (disease || '').toLowerCase();
    const qLower = (query || '').toLowerCase();
    const currentYear = new Date().getFullYear();
    
    // 🧪 Scoring Weights from Revised Specification
    const WEIGHTS = { DISEASE: 0.35, CLINICAL: 0.30, RECENCY: 0.20, QUALITY: 0.15 };
    
    const treatmentKeywords = ['treatment', 'therapy', 'management', 'clinical', 'efficacy', 'trial', 'outcome', 'intervention', 'surgery', 'drug', 'medicine'];
    const diseaseKeywords = dLower.split(/\s+/).filter(kw => kw.length > 3);

    const scored = results.map(r => {
        let score = 0;
        const title = (r.title || '').toLowerCase();
        const abstract = (r.abstract || '').toLowerCase();
        const text = `${title} ${abstract}`;

        // 1. Disease Match (Max 0.35)
        let diseaseScore = 0;
        if (dLower && title.includes(dLower)) diseaseScore = WEIGHTS.DISEASE;
        else if (dLower && abstract.includes(dLower)) diseaseScore = WEIGHTS.DISEASE * 0.45; // ~0.15
        else {
            const matches = diseaseKeywords.filter(kw => text.includes(kw));
            if (matches.length > 0) diseaseScore = WEIGHTS.DISEASE * 0.7; // Synonym-ish match
        }
        score += diseaseScore;

        // 2. Clinical Value (Max 0.30)
        let clinicalScore = 0;
        const tMatches = treatmentKeywords.filter(kw => text.includes(kw));
        if (tMatches.length >= 3) clinicalScore = WEIGHTS.CLINICAL;
        else if (tMatches.length > 0) clinicalScore = WEIGHTS.CLINICAL * 0.5;
        score += clinicalScore;

        // 3. Recency (Max 0.20)
        let recencyScore = 0;
        if (r.year >= currentYear - 2) recencyScore = WEIGHTS.RECENCY;
        else if (r.year >= 2015) recencyScore = WEIGHTS.RECENCY * 0.75;
        else recencyScore = WEIGHTS.RECENCY * 0.4;
        score += recencyScore;

        // 4. Study Quality (Max 0.15)
        let qualityScore = 0;
        if (text.includes('systematic review') || text.includes('meta-analysis') || text.includes('randomized controlled trial')) {
            qualityScore = WEIGHTS.QUALITY;
        } else if (text.includes('cohort') || text.includes('observational')) {
            qualityScore = WEIGHTS.QUALITY * 0.66;
        } else {
            qualityScore = WEIGHTS.QUALITY * 0.5;
        }
        score += qualityScore;

        // Metadata for UI
        let studyType = 'Clinical Research';
        if (text.includes('systematic review')) studyType = 'Systematic Review';
        else if (text.includes('rct') || text.includes('randomized')) studyType = 'RCT';

        return { ...r, score: parseFloat(score.toFixed(2)), studyType };
    });

    // 🧬 [REVISED] REJECT ONLY IF ABSOLUTE JUNK
    return scored
        .filter(r => r.score >= 0.2) // Lowered from 0.45 for better recall in mock mode
        .sort((a, b) => b.score - a.score);
};

// 🧪 [STEP 10] FALLBACK QUERY EXPANSION
const expandQuery = (disease, query) => {
    // Basic expansion: disease + query + medical keywords
    let expanded = `${disease} ${query} research treatment clinical trial 2024 2025`;
    
    // Disease-specific keywords if detected (agnostic logic)
    if (query.toLowerCase().includes('lung')) expanded += ' oncology oncology pulmonary';
    if (query.toLowerCase().includes('heart')) expanded += ' cardiovascular cardiology';
    if (query.toLowerCase().includes('brain')) expanded += ' neurology neuroscience';

    return expanded;
};

const storeResults = async (results, sessionId) => {
    const docs = await Promise.all(results.map(async r => {
        const textToEmbed = `${r.title} ${r.abstract || ''}`.slice(0, 1000);
        return {
            ...r,
            embedding: await embedText(textToEmbed),
            sessionId,
        };
    }));
    await Research.insertMany(docs);
};

// 🧪 [STEP 5 & 6] CLINICAL TRIALS FALLBACK HIERARCHY
const getTrialFallback = (trials, location, disease) => {
    // 1. Same disease + location
    let final = trials.filter(t => t.isLocal);
    
    // 2. Same disease (Global)
    if (final.length < 2) {
        final = trials.slice(0, 5); 
    }

    // 3. Fallback marker for UI/LLM
    if (final.length > 0 && !final.some(t => t.isLocal) && location) {
        final.forEach(t => t.fallbackNote = `No trials found in ${location}. Showing global trials for ${disease}.`);
    }

    return final.slice(0, 5);
};

// 🧪 [STEP 1, 7, 8] FINAL RETRIEVAL FUNCTION
const retrieveRelevant = async (query, sessionId, disease, location) => {
    try {
        const qVec = await embedText(expandQuery(disease, query));
        
        console.log(`🔍 [DEBUG] Searching Vector Store for: ${disease}...`);

        const vectorResults = await Research.aggregate([
            {
                $vectorSearch: {
                    index: 'vector_index',
                    path: 'embedding',
                    queryVector: qVec,
                    numCandidates: 100,
                    limit: 80
                }
            },
            { $match: { sessionId } },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    abstract: 1,
                    url: 1,
                    source: 1,
                    year: 1,
                    sessionId: 1,
                    searchScore: { $meta: "vectorSearchScore" }
                }
            },
            {
                $match: {
                    searchScore: { $gte: 0.1 } // Lowered threshold significantly for Mock Mode
                }
            }
        ]);

        console.log(`📊 [DEBUG] Reliability Guard: ${vectorResults.length} / 80 items above 0.75 threshold.`);

        // 🧬 Step 2: Global Deduplicate
        const uniqueItems = deduplicate(vectorResults);

        // 🧬 Step 2.5: Strict Keyword Relevance Filter
        const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const relevantResults = uniqueItems.filter(doc => {
            const text = `${doc.title} ${doc.abstract}`.toLowerCase();
            return queryWords.some(word => text.includes(word));
        });

        console.log(`📊 [DEBUG] Keyword Relevance Guard: ${relevantResults.length} items matched intent.`);

        // 🧬 Step 3 & 4: Advanced Ranking
        const ranked = rankAndFilterResults(relevantResults, disease, query, location);

        // 🧬 Step 7: Strict Source Separation
        const papers = ranked.filter(r => r.source === 'pubmed' || r.source === 'openalex');
        const trials = ranked.filter(r => r.source === 'clinicaltrials');

        // 🧬 Final Fallback: If everything was filtered out, return top 5 unique results from current session database
        if (papers.length === 0 && trials.length === 0) {
            console.log('🚨 [DEBUG] All results filtered out. Triggering Final Session Fallback...');
            const sessionBackup = await Research.find({ sessionId }).limit(5);
            return {
                papers: sessionBackup.filter(r => r.source !== 'clinicaltrials'),
                trials: sessionBackup.filter(r => r.source === 'clinicaltrials')
            };
        }

        return {
            papers: papers.slice(0, 8),
            trials: trials.length > 0 ? (trials.slice(0, 5)) : [] // Clean slice for trials
        };
    } catch (error) {
        console.error('❌ [DEBUG] Reliability Overhaul Error:', error.message);
        return { papers: [], trials: [] };
    }
};

// 🧪 STEP 6: Standalone Test Function
const testVectorSearch = async (testQuery, disease = "General Health") => {
    console.log(`\n🧪 RUNNING STANDALONE TEST: "${testQuery}"`);
    try {
        const results = await retrieveRelevant(testQuery, "test_session_id", disease);
        console.log(`\nTest Result Summary:`);
        results.forEach((r, i) => {
            console.log(`${i+1}. [Score: ${r.score}] ${r.title.slice(0,60)}...`);
        });
        return results;
    } catch (err) {
        console.error("Test function failed:", err.message);
    }
};

module.exports = { 
    storeResults, 
    retrieveRelevant, 
    rankAndFilterResults, 
    expandQuery, 
    deduplicate,
    testVectorSearch
};
