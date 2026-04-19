const mongoose = require('mongoose');
const { Schema } = mongoose;

const sessionSchema = new Schema({
    sessionId : { type: String, required: true, unique: true },
    disease : String,
    location : String,
    messages : [{
        role : { type: String, enum: ['user', 'assistant'] },
        content : String,
        sources : [{ title: String, url: String, year: Number }],
        createdAt : { type: Date, default: Date.now },
    }],
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
