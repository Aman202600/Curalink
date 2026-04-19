# CuraLink - AI Medical Research Assistant

CuraLink is a professional health research companion designed for patients and researchers. It bridges the gap between complex medical publications and patient understanding by providing a citation-backed, anti-hallucination RAG (Retrieval-Augmented Generation) pipeline.

## 🧬 Core Features
- **Multi-Source Retrieval**: Simultaneously queries **PubMed**, **OpenAlex**, and **ClinicalTrials.gov** for real-time data.
- **On-Device Embeddings**: Uses `@xenova/transformers` to run the `all-MiniLM-L6-v2` model natively in Node.js for high-speed local vectorization.
- **Semantic RAG**: Leverages **MongoDB Atlas Vector Search** to rank up to 100 retrieved documents, passing only the top 8 most relevant snippets to the LLM.
- **Anti-Hallucination Prompting**: Constrains the LLM to strictly reason over provided sources and include inline citations (e.g., [SOURCE 1]).
- **Premium UI**: 
  - **Two-Panel Layout**: Chat on the left (40%), interactive source cards on the right (60%).
  - **Transparent Pipeline**: A step-loader that visualizes every stage: Fetching -> Embedding -> Ranking -> Generating.
  - **Medical Aesthetic**: Clean whites, teal accents, and generous whitespace for a trustworthy feel.

## 🛠️ Technology Stack
- **Frontend**: React + Vite, Tailwind CSS v4, Framer Motion, Lucide icons.
- **Backend**: Node.js, Express, Mongoose.
- **Database**: MongoDB Atlas (Vector Search + Session Store).
- **AI/LLM**: OpenRouter (GPT-OSS-120B) for high-reasoning free inference.

## 🚀 Setup Instructions

### 1. Backend Configuration (server/)
1. Navigate to the `server/` directory.
2. Install dependencies: `npm install`.
3. Configure `.env`:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `OPENROUTER_API_KEY`: Your key from [openrouter.ai](https://openrouter.ai/).
4. **Atlas Search Index**:
   Create a **Vector Search** index named `vector_index` on the `researches` collection with this definition:
   ```json
   {
     "fields": [
       {
         "numDimensions": 384,
         "path": "embedding",
         "similarity": "cosine",
         "type": "vector"
       },
       {
         "path": "sessionId",
         "type": "filter"
       }
     ]
   }
   ```
5. Start: `npm start`.

### 2. Frontend Configuration (client/)
1. Navigate to the `client/` directory.
2. Install dependencies: `npm install`.
3. Start Dev Server: `npm run dev`.

---

## 🏗️ Folder Structure
- `server/services/`: Modular fetchers for PubMed, OpenAlex, and ClinicalTrials.
- `server/services/embedder.js`: Native MiniLM model runner.
- `server/services/vectorStore.js`: Atlas Vector Search integration.
- `client/src/components/`: ChatWindow, SourceCard (interactive metadata), and StepLoader.

## 🏆 Project Goal
"The system fetches 100 candidates from three open medical APIs, embeds them locally using MiniLM, stores vectors in MongoDB Atlas, runs semantic similarity search to find the 8 most relevant results, then constrains the LLM to cite only those sources — this prevents hallucination, which is critical in a medical context."
