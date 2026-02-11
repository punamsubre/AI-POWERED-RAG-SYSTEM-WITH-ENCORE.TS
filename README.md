# AI-Powered RAG System with Encore.ts, Temporal & Vertex AI

A Production-Ready Retrieval-Augmented Generation (RAG) system combining **Temporal** workflow orchestration with **Encore.ts** infrastructure management and **Google Cloud Vertex AI**.

## Architecture

| Layer | Technology | Purpose |
|:---|:---|:---|
| Workflow Orchestration | **Temporal** | Retry logic, error recovery, pipeline visibility |
| Infrastructure | **Encore.ts** | PostgreSQL, pgvector, API hosting, service mesh |
| AI | **Vertex AI** | Embeddings (text-embedding-004) + Generation (Gemini 2.5 Flash) |
| Storage | **Google Cloud Storage** | Source PDF documents |

## Services

- **`temporal/`** — Temporal workflow, activities, worker, and trigger API
- **`upload/`** — PDF text extraction and document storage
- **`embedding/`** — Vector embedding generation and storage (pgvector)
- **`query/`** — Semantic search and AI-powered Q&A
- **`ai/`** — Centralized Vertex AI gateway

## Prerequisites

- [Encore CLI](https://encore.dev/docs/install)
- [Temporal CLI](https://docs.temporal.io/cli)
- Docker Desktop (for local PostgreSQL)
- GCP credentials with Vertex AI access
- Node.js 18+

## Quick Start

```bash
# Terminal 1: Start Temporal Server
temporal server start-dev --db-filename temporal.db

# Terminal 2: Start Encore
encore run

# Terminal 3: Start Temporal Worker
npx ts-node temporal/worker.ts

# Terminal 4: Trigger ingestion
curl -X POST http://localhost:4000/trigger \
  -H "Content-Type: application/json" \
  -d '{"bucket":"your-bucket","blob":"document.pdf"}'

# Ask a question
curl http://localhost:4000/ask?q=What+is+in+the+document
```

## Monitoring

- **Encore Dashboard**: http://localhost:9400
- **Temporal Web UI**: http://localhost:8233
