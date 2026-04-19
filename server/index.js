require('dotenv').config(); // MUST BE ON LINE 1
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const chatRoute = require('./routes/chat');
const { getEmbedder } = require('./services/embedder');

// Verify environment variable is loaded
if (!process.env.MONGODB_URI) {
    console.error('CRITICAL ERROR: MONGODB_URI is not defined in .env file');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware to debug incoming calls
app.use((req, res, next) => {
    console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Health Checks
app.get('/', (req, res) => res.send('CuraLink API is running. Use POST /api/chat for queries.'));
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// 1. Improved MongoDB Connection with proper options and logging
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            // Options to prevent timeout and buffering issues
            serverSelectionTimeoutMS: 5000, 
            autoIndex: true, 
        });
        console.log('✅ MongoDB Connected Successfully');
    } catch (err) {
        console.error('❌ MongoDB Connection Failed:');
        console.error(err.message);
        
        // Debug Tip: Log the first few chars of URI (NOT the whole thing for security)
        console.log(`Scheme used: ${process.env.MONGODB_URI.split(':')[0]}://`);
        
        process.exit(1); // Stop the server if DB fails
    }
};

// 2. Load routes
app.use('/api', chatRoute);

// 3. Catch-all for undefined routes
app.use((req, res) => {
    console.warn(`🛑 Route not found: ${req.method} ${req.url}`);
    res.status(404).json({ 
        error: 'Not Found', 
        message: `The route ${req.method} ${req.url} does not exist on this server.` 
    });
});

// 3. Initialize App
const startServer = async () => {
    // Connect to Database first
    await connectDB();

    // Warm up the embedder model (Currently Mocked)
    console.log('⏳ Initializing embedder pipeline...');
    await getEmbedder();
    console.log('✅ Embedder ready (Mock Mode)');

    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
};

startServer();
