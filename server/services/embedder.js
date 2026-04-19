const { pipeline } = require('@xenova/transformers');

let embedder;

const getEmbedder = async () => {
    if (!embedder) {
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return embedder;
};

const embedText = async (text) => {
    const embed = await getEmbedder();
    const out = await embed(text, { pooling: 'mean', normalize: true });
    return Array.from(out.data); // float[] ready for MongoDB
};

module.exports = { embedText, getEmbedder };
