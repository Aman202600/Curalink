const express = require('express');
const router = express.Router();

const fetchPubMed = require('../services/pubmed');
const fetchOpenAlex = require('../services/openAlex');
const fetchClinicalTrials = require('../services/clinicalTrials');
const { storeResults, retrieveRelevant, rankAndFilterResults, expandQuery, deduplicate } = require('../services/vectorStore');
const { generateResponse, validateAndRankEvidence } = require('../services/llm');
const Session = require('../models/Session');

router.post('/chat', async (req, res) => {
    console.log('--- 🚀 New Chat Request ---');

    try {
        const { query, disease, location, sessionId } = req.body;

        // 🔒 Basic validation (IMPORTANT)
        if (!query || !sessionId) {
            return res.status(400).json({
                error: "query and sessionId are required"
            });
        }

        // 1. Parallel fetch
        console.log('📡 [1/5] Deep Fetching from PubMed, OpenAlex, Trials...');
        const [pubmed, openAlex, trials] = await Promise.allSettled([
            fetchPubMed(disease, query),
            fetchOpenAlex(disease, query),
            fetchClinicalTrials(disease, location),
        ]);

        const rawPapers = [
            ...(pubmed.status === 'fulfilled' && Array.isArray(pubmed.value) ? pubmed.value : []),
            ...(openAlex.status === 'fulfilled' && Array.isArray(openAlex.value) ? openAlex.value : []),
        ];
        const rawTrials = (trials.status === 'fulfilled' && Array.isArray(trials.value)) ? trials.value : [];

        console.log(`[STEP 11] Total fetched: Papers: ${rawPapers.length}, Trials: ${rawTrials.length}`);

        // 🧠 Global Deduplicate before further processing
        const allFetched = [...rawPapers, ...rawTrials];
        const uniqueFetched = deduplicate(allFetched);
        
        console.log(`[STEP 11] After dedup: ${uniqueFetched.length}`);

        // 🧠 Step 3, 4: Heuristic Ranking (Initial Pass)
        const rankedHeuristic = rankAndFilterResults(uniqueFetched, disease, query, location);
        console.log(`[STEP 11] Initial heuristic candidates: ${rankedHeuristic.length}`);

        // 🧪 STEP 3.5: AI-Driven Evidence Validation (Revised Calibration)
        // We refine the top 20 heuristic candidates via the Balanced LLM Validator
        const candidatePapers = rankedHeuristic.slice(0, 20);
        let validatedSet = { evidence: [], confidence: 'none', total_fetched: candidatePapers.length, total_passed: 0 };
        
        if (candidatePapers.length > 0) {
            console.log('🤖 [3.5/5] Engine Filtering: Validating evidence pool (Threshold 0.45)...');
            validatedSet = await validateAndRankEvidence(query, disease, candidatePapers);
            
            // Map AI results back to full objects (preserving original metadata like URLs)
            validatedSet.evidence = (validatedSet.evidence || []).map(aiItem => {
                const original = candidatePapers.find(p => p.title === aiItem.title);
                return {
                    ...original,
                    summary: aiItem.summary, 
                    score: aiItem.score,     
                    validated: true
                };
            }).filter(p => p.title);
        }

        const topPapers = (validatedSet.evidence || []).filter(r => r.source !== 'clinicaltrials').slice(0, 8);
        const topTrials = (validatedSet.evidence || []).filter(r => r.source === 'clinicaltrials').slice(0, 5);
        
        // Fallback: If AI was too strict, use heuristic top items
        const finalPapers = topPapers.length > 0 ? topPapers : rankedHeuristic.filter(r => r.source !== 'clinicaltrials').slice(0, 5);
        const finalTrials = topTrials.length > 0 ? topTrials : rankedHeuristic.filter(r => r.source === 'clinicaltrials').slice(0, 3);

        // 2. Embed and Store ONLY Verified results
        const allToStore = [...finalPapers, ...finalTrials];
        if (allToStore.length > 0) {
            console.log(`💾 [DEBUG] Embedding ${allToStore.length} verified results (Confidence: ${validatedSet.confidence})...`);
            await storeResults(allToStore, sessionId);
        } else {
            console.warn('⚠️ [DEBUG] No relevant results found in API payload.');
            // 🚨 EMERGENCY: If everything was filtered out, store top 3 raw items anyway
            const emergencyResults = uniqueFetched.slice(0, 5);
            if (emergencyResults.length > 0) {
                console.log('🚨 [DEBUG] Storing emergency raw results to ensure non-empty retrieval.');
                await storeResults(emergencyResults, sessionId);
            }
        }

        // 3. RAG Search + Fallback Logic (Step 3 & 4)
        console.log(`🔍 [3/5] Performing Semantic Search for ${disease}...`);
        let relevant = await retrieveRelevant(query, sessionId, disease, location);
        
        // 🧪 STEP 3: Fallback Query Expansion if results are critically low
        if ((relevant.papers.length + relevant.trials.length) < 3) {
            console.log('⚠️ [DEBUG] Result count critically low. Triggering Fallback Query Expansion...');
            
            // Broaden query: Disease + "research treatment clinical trials"
            const broaderQuery = `${disease} research treatment clinical trials results 2024`;
            
            // Re-fetch with broader query
            const fallbackRelevant = await retrieveRelevant(broaderQuery, sessionId, disease, location);
            
            // Merge results (deduplicate by URL)
            const existingUrls = new Set([...relevant.papers, ...relevant.trials].map(r => r.url));
            
            fallbackRelevant.papers.forEach(p => {
                if (!existingUrls.has(p.url) && relevant.papers.length < 8) {
                    relevant.papers.push(p);
                    existingUrls.add(p.url);
                }
            });

            fallbackRelevant.trials.forEach(t => {
                if (!existingUrls.has(t.url) && relevant.trials.length < 5) {
                    relevant.trials.push(t);
                    existingUrls.add(t.url);
                }
            });

            console.log(`✅ [DEBUG] Fallback complete. New totals: Papers: ${relevant.papers.length}, Trials: ${relevant.trials.length}`);
        }

        console.log(`[STEP 11] Final papers: ${relevant.papers.length}`);
        console.log(`[STEP 11] Final trials: ${relevant.trials.length}`);

        console.log(`✅ [DEBUG] Final Context Composition: Papers: ${relevant.papers.length}, Trials: ${relevant.trials.length}`);

        const combinedSources = [...relevant.papers, ...relevant.trials];
        const hasReliableEvidence = combinedSources.length > 0;
        console.log(`📊 [DEBUG] Has Reliable Evidence: ${hasReliableEvidence}`);

        // 4. Session History
        console.log('🧠 [4/5] Loading Conversation History...');
        let session = await Session.findOne({ sessionId });

        if (!session) {
            session = new Session({
                sessionId,
                disease,
                location,
                messages: []
            });
        }

        const history = session.messages || [];

        // 5. LLM Response
        console.log('🤖 [5/5] Generating Structured LLM Response...');
        const structuredAnswer = await generateResponse(
            query,
            disease,
            location,
            hasReliableEvidence ? combinedSources : [],
            history
        );

        // Save conversation
        session.messages.push({ role: 'user', content: query });

        session.messages.push({
            role: 'assistant',
            content: typeof structuredAnswer === 'string' ? structuredAnswer : JSON.stringify(structuredAnswer),
            sources: [...relevant.papers, ...relevant.trials].map(r => ({
                title: r.title,
                url: r.url,
                year: r.year,
                source: r.source
            }))
        });

        await session.save();

        return res.json({
            answer: structuredAnswer,
            sources: hasReliableEvidence ? combinedSources : [],
            metadata: {
                confidence: validatedSet.confidence,
                totalFetched: uniqueFetched.length,
                totalPassed: validatedSet.total_passed
            }
        });

    } catch (error) {
        console.error("🔥 ERROR:", error.message);
        console.error("🔥 STACK:", error.stack);

        return res.status(500).json({
            answer: "Internal Server Error",
            error: error.message,
            sources: []
        });
    }
});

module.exports = router;
