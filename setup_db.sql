-- DChat Database Setup — Run this in Supabase SQL Editor
-- Enables pgvector, creates tables, functions, and RLS policies

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Reference Documents table
CREATE TABLE IF NOT EXISTS reference_docs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    storage_path TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Document Chunks with Embeddings
CREATE TABLE IF NOT EXISTS doc_chunks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    doc_id UUID REFERENCES reference_docs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    chunk_index INT,
    chunk_text TEXT,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Questionnaire Runs
CREATE TABLE IF NOT EXISTS runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    questionnaire_filename TEXT,
    status TEXT DEFAULT 'pending',
    total_questions INT DEFAULT 0,
    answered_count INT DEFAULT 0,
    not_found_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Questions & Answers
CREATE TABLE IF NOT EXISTS qa_pairs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
    question_number INT,
    question_text TEXT,
    generated_answer TEXT,
    edited_answer TEXT,
    citations JSONB DEFAULT '[]',
    confidence FLOAT DEFAULT 0,
    evidence_snippets JSONB DEFAULT '[]',
    is_found BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Vector similarity search function (used by RAG pipeline)
CREATE OR REPLACE FUNCTION match_chunks(
    query_embedding VECTOR(1536),
    match_user_id UUID,
    match_count INT DEFAULT 5,
    match_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    id UUID,
    doc_id UUID,
    chunk_text TEXT,
    filename TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT dc.id, dc.doc_id, dc.chunk_text, rd.filename,
           1 - (dc.embedding <=> query_embedding) AS similarity
    FROM doc_chunks dc
    JOIN reference_docs rd ON rd.id = dc.doc_id
    WHERE dc.user_id = match_user_id
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 7. Row Level Security
ALTER TABLE reference_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_pairs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
DO $$
BEGIN
    -- reference_docs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'own_docs') THEN
        CREATE POLICY "own_docs" ON reference_docs FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- doc_chunks
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'own_chunks') THEN
        CREATE POLICY "own_chunks" ON doc_chunks FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- runs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'own_runs') THEN
        CREATE POLICY "own_runs" ON runs FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- qa_pairs (via run ownership)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'own_qa') THEN
        CREATE POLICY "own_qa" ON qa_pairs FOR ALL
            USING (run_id IN (SELECT id FROM runs WHERE user_id = auth.uid()));
    END IF;
END $$;

-- 8. Create index for faster vector search
CREATE INDEX IF NOT EXISTS idx_doc_chunks_embedding ON doc_chunks
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_doc_chunks_user_id ON doc_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_runs_user_id ON runs(user_id);
CREATE INDEX IF NOT EXISTS idx_qa_pairs_run_id ON qa_pairs(run_id);
