CREATE TABLE chunks (
    id SERIAL PRIMARY KEY,
    document_id TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding JSONB NOT NULL, -- Storing as JSONB for now since pgvector might not be available locally
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
