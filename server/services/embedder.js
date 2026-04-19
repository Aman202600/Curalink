// Mock Embedder - Removed @xenova/transformers to fix 'sharp' deployment issues on Render.
// This allows the app to run without heavy local dependencies.

/**
 * Placeholder for the model loader.
 * Returns a simple resolved promise to keep existing calling code compatible.
 */
const getEmbedder = async () => {
    return Promise.resolve(true);
};

/**
 * Generates a dummy embedding vector.
 * @param {string} text - The input text (ignored in this mock).
 * @returns {Promise<number[]>} - A 384-dimensional array of zeros.
 */
const embedText = async (text) => {
    // 384 dimensions matches the previous all-MiniLM-L6-v2 model
    return new Array(384).fill(0); 
};

module.exports = { embedText, getEmbedder };

