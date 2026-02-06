# AI-Powered RAG System with Encore.ts & Vertex AI

This project is a Production-Ready Retrieval-Augmented Generation (RAG) system built with Encore.ts and Google Cloud Vertex AI. It supports PDF text extraction, high-dimensional vector search using `pgvector`, and context-aware question answering with Gemini.

## Features

- **Document Ingestion:** Extract text from PDFs using `pdf-parse`.
- **Vector Search:** Semantic retrieval powered by PostgreSQL `pgvector` and `text-embedding-004`.
- **Intelligent QA:** Generation synthesized by the latest Gemini model (2.5 Flash).
- **Service-Oriented:** Clean architectural separation between Upload, Embedding, Query, and AI services.

## Prerequisites

1.  **Google Cloud Project:** With Vertex AI API enabled.
2.  **Authentication:** Set up Application Default Credentials (`gcloud auth application-default login`).
3.  **Environment Variables:** Create a `.env` file with:
    - `GOOGLE_CLOUD_PROJECT=your-project-id`
    - `GOOGLE_CLOUD_LOCATION=us-central1`
    - `GOOGLE_GENAI_USE_VERTEXAI=True`

## Running Locally

```bash
# Start the Encore runtime (automatically handles DB and migrations)
encore run
```

## How to Use

### 🖥️ Option 1: Demo UI (Recommended)
Open the provided `demo.html` file directly in your browser. This custom interface handles the PDF Base64 conversion and displays answers beautifully.

### 🛠️ Option 2: API Request
#### 1. Upload a PDF
Send a POST request to `/upload` with the filename and base64 content.

### 2. Ask a Question
Send a GET request to `/ask?q=your-question`. The system will retrieve relevant chunks from your documents and provide a context-aware answer.

---
Built with 💎 **Encore.ts**
