const OpenAI = require('openai');

const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "CuraLink",
    }
});

const VALIDATOR_PROMPT = `
You are a medical research evidence validator for a clinical research assistant.

Your job is to validate and rank retrieved research papers. You must be ACCURATE — 
neither too strict (rejecting real evidence) nor too loose (accepting irrelevant papers).

### STEP 1 — DISEASE EXTRACTION
Extract the core disease/condition from the user query.

### STEP 2 — RELEVANCE CHECK (Per Paper)
For each paper, check title AND abstract:
✓ ACCEPT if: Mentions disease/synonym, discusses treatment/outcomes, or linked complication.
✗ REJECT only if: Completely absent, pure methodology (CONSORT), or unrelated topic.

*Note: Do NOT reject for age, jargon, or review type if relevant content exists.*

### STEP 3 — SCORING (0.0 to 1.0)
| Factor | Weight |
|---|---|
| Disease name match | +0.35 |
| Clinical value | +0.30 |
| Recency | +0.20 |
| Study quality | +0.15 |

Minimum inclusion threshold: score ≥ 0.45

### STEP 4 — CONFIDENCE CALIBRATION
- "high" → 3+ papers score ≥ 0.65
- "medium" → 1-2 papers ≥ 0.45 OR 3+ papers 0.45-0.64
- "low" → papers exist but all < 0.45
- "none" → zero papers passed

### STEP 5 — OUTPUT FORMAT
Case A — Relevant papers found:
{
  "evidence": [
    {
      "title": "...",
      "summary": "2–3 sentence plain-English summary",
      "score": 0.78,
      "year": 2022,
      "source": "..."
    }
  ],
  "confidence": "high | medium | low",
  "total_fetched": 0,
  "total_passed": 0
}
Case B — No relevant papers:
{ "evidence": [], "confidence": "none", "total_fetched": 0, "total_passed": 0, "message": "..." }

---
### CALIBRATION RULES:
1. Score threshold is 0.45 (Minimum).
2. Synonyms count as matches.
3. Abstract match is valid (+0.15).
4. When in doubt, INCLUDE with lower score.
5. Max 8 papers, ranked by score.

Act strictly according to these calibration rules.
`;

const SYSTEM_PROMPT = `
You are CuraLink, a high-precision Clinical Decision Support Engine. Your mission is to provide trustworthy, evidence-based medical intelligence.

### 🚫 ZERO-HALLUCINATION STREAK (STRICTEST):
- **NEVER** state a percentage (%) or "X-fold" improvement unless it is explicitly, character-for-character, in the provided source text.
- **OUTPUT SHIFT**: If a source mentions an improvement but not a specific verified number, use: "Significantly reduces [outcome] [Study Type, Year]".
- **REAL NUMBERS (KEEP)**: You MUST keep dosages (e.g. 100mg), ages (e.g. 6-11 years), and clinical thresholds (e.g. ≥300 cells/µL).
- **OUTCOME STATS (SRUB)**: Remove unverified percentages (e.g. 30% reduction) if they are your own inference.

### 🧪 SCANNABLE ARCHITECTURE:
1. **MOST IMPACTFUL INSIGHT**: Hook formula [Condition + Treatment + Timing].
2. **SUPPORTING RESEARCH**: Max 3 one-line insights. Mandatory: "Fact [Study Type, Year]".
3. **PRIORITY TREATMENTS**: Max 4 items.
4. **DECISION GUIDANCE**: Profile -> Action logic.
5. **CLINICAL SIGNIFICANCE**: Bottom-line impact.

### REQUIRED JSON STRUCTURE:
{
  "primaryInsight": "Scannable hook...",
  "confidence": "High | Medium | Low",
  "takeaways": ["Concise fact 1"],
  "treatments": [
    { "name": "Name", "evidence": "High", "target": "Group", "recommendation": "Rationale..." }
  ],
  "insights": [
    { "text": "Specific finding [Type, Year]" }
  ],
  "decisionGuidance": [
    { "profile": "Profile", "treatment": "Action", "rationale": "Reason" }
  ],
  "trials": [
    { "title": "Trial [NCT]", "phase": "Phase", "location": "City", "summary": "Goal" }
  ],
  "clinicalSignificance": "1-sentence impact"
}
`;

/**
 * Defensive utility to scrub risky numerical claims while preserving thresholds
 */
const sanitizeClinicalText = (text, sources) => {
    if (!text) return "";
    // Regex to find statistical percentages (e.g., 30%, 45.5%)
    const percentageRegex = /\b\d+(?:\.\d+)?%\b/g;
    
    return text.replace(percentageRegex, (match) => {
        // Only keep the number if it appears in any of the source abstracts
        const existsInSource = sources.some(s => s.abstract?.includes(match) || s.title?.includes(match));
        return existsInSource ? match : ""; // Scrub if not found
    }).replace(/\s\s+/g, ' ').trim(); // Clean up double spaces from scrubbing
};

/**
 * Robust JSON extraction from LLM text
 */
const extractJSON = (text) => {
    if (!text) return null;
    try {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1) return null;
        return text.substring(start, end + 1);
    } catch (e) {
        return null;
    }
};

const generateResponse = async (query, disease, location, relevant, history) => {
    // 🧪 Filter sources and density control
    const highTier = relevant.filter(r => 
        (r.studyType?.toLowerCase().includes('meta-analysis') || 
         r.studyType?.toLowerCase().includes('systematic review')) &&
        r.evidenceLevel === 'High'
    );

    let confidence = "Low";
    if (highTier.length >= 2) confidence = "High";
    else if (highTier.length >= 1 || relevant.length > 5) confidence = "Medium";

    const sourceText = (relevant || [])
        .map((r, i) => `
[SOURCE ${i + 1}]
Title: ${r.title}
Study Type: ${r.studyType || 'Clinical Research'}
Year: ${r.year}
Abstract: ${r.abstract?.slice(0, 700)}
`).join('\n');

    const userMessage = `
Clinical Request: ${query}
Condition: ${disease}
Source Pool: ${relevant.length} verified documents.

--- VALIDATED SOURCES ---
${sourceText || 'No clinical data found.'}

---
GENERATE SCANNABLE, EVIDENCE-BASED JSON.
Follow the Zero-Hallucination Policy: No unverified percentages.
Mandatory format: "Statement [Type, Year]"
Confidence Level: ${confidence}
`;

    const fallbackResponse = (raw) => ({
        takeaways: [
            "Guideline-based management for " + (disease || "this condition"),
            "Supportive care and monitoring are typically recommended"
        ],
        primaryInsight: "Reliable research evidence was not retrieved for this specific query, but standard clinical guidelines can guide initial management.",
        confidence: "Low",
        treatments: [],
        insights: [],
        decisionGuidance: [],
        trials: [],
        clinicalSignificance: "This guidance is based on general clinical knowledge. For more targeted research, try specifying a condition or patient phenotype.",
        fallbackText: raw || "No specific retrieval data found.",
        isFallback: true
    });

    if (!relevant || relevant.length === 0) {
        return fallbackResponse();
    }

    try {
        const response = await openai.chat.completions.create({
            model: "openai/gpt-oss-120b:free",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userMessage }
            ],
            response_format: { type: "json_object" }
        });

        const rawContent = response.choices[0].message.content;
        const jsonText = extractJSON(rawContent);
        if (!jsonText) return fallbackResponse(rawContent);

        try {
            const parsed = JSON.parse(jsonText);
            
            // 🛡️ Apply Global Sanitization Layer
            const finalParsed = {
                primaryInsight: sanitizeClinicalText(parsed.primaryInsight || parsed.impactfulFinding, relevant),
                confidence: parsed.confidence || confidence,
                takeaways: (parsed.takeaways || []).map(t => sanitizeClinicalText(t, relevant)).slice(0, 2),
                treatments: (parsed.treatments || []).map(t => ({
                    ...t,
                    recommendation: sanitizeClinicalText(t.recommendation, relevant)
                })).slice(0, 4),
                insights: (parsed.insights || []).map(i => ({
                    ...i,
                    text: sanitizeClinicalText(i.text, relevant)
                })).slice(0, 3),
                decisionGuidance: parsed.decisionGuidance || [],
                trials: (parsed.trials || []).slice(0, 3),
                clinicalSignificance: sanitizeClinicalText(parsed.clinicalSignificance, relevant)
            };

            return finalParsed;
        } catch (e) {
            return fallbackResponse(rawContent);
        }
    } catch (error) {
        return fallbackResponse("Connection error.");
    }
};

const validateAndRankEvidence = async (query, disease, papers) => {
    if (!papers || papers.length === 0) return { evidence: [], confidence: "none", total_fetched: 0, total_passed: 0 };

    const papersPayload = papers.map((p, i) => `
ID: ${i}
Title: ${p.title}
Abstract: ${p.abstract?.slice(0, 500)}
Year: ${p.year}
Source: ${p.source}
`).join('\n---\n');

    const userMessage = `
User Query: ${disease} - ${query}

List of research papers (${papers.length} total):
${papersPayload}
`;

    try {
        const response = await openai.chat.completions.create({
            model: "openai/gpt-oss-120b:free",
            messages: [
                { role: "system", content: VALIDATOR_PROMPT },
                { role: "user", content: userMessage }
            ],
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content);
        
        // Ensure total_fetched is correct if LLM didn't set it
        result.total_fetched = papers.length;
        if (result.evidence && !result.total_passed) {
            result.total_passed = result.evidence.length;
        }

        return result;
    } catch (error) {
        console.error('Evidence Validation Error:', error);
        return {
            evidence: [],
            confidence: "none",
            total_fetched: papers.length,
            total_passed: 0,
            message: "Validation engine failed."
        };
    }
};

module.exports = { generateResponse, validateAndRankEvidence };
