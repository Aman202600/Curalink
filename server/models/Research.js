const mongoose = require('mongoose');
const { Schema } = mongoose;

const researchSchema = new Schema({
    sessionId : String,
    source : { type: String, enum: ['pubmed','openalex','clinicaltrials'] },
    title : String,
    abstract : String,
    authors : [String],
    year : Number,
    url : String,
    // Clinical trial specific fields
    status : String, // RECRUITING | COMPLETED | ACTIVE_NOT_RECRUITING
    eligibility : String,
    location : String,
    contact : String,
    // Search metadata
    score: Number,
    studyType: String,
    validated: Boolean,
    summary: String,
    // RAG vector — 384 dimensions (MiniLM)
    embedding : [Number],
}, { timestamps: true });

module.exports = mongoose.model('Research', researchSchema);
