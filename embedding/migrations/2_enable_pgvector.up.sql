CREATE EXTENSION IF NOT EXISTS vector;

-- Ensure chunks table is empty to avoid dimension mismatch with existing data
TRUNCATE TABLE chunks;

ALTER TABLE chunks 
ALTER COLUMN embedding TYPE vector(768) 
USING embedding::text::vector;
