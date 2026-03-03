-- ============================================================
-- DChat — Complete Database Setup (Supabase)
-- ============================================================
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor → New Query
-- This is idempotent — safe to re-run on an existing database.
--
-- Tables: reference_docs, doc_chunks, runs, qa_pairs, documents
-- Functions: match_chunks (RAG pipeline), match_documents (n8n chat)
-- Includes: RLS policies, indexes, triggers
-- ============================================================


-- ============================================================
-- STEP 1: Enable Required Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;


-- ============================================================
-- STEP 2: Core Tables
-- ============================================================

-- 2a. Reference Documents (uploaded by users)
CREATE TABLE IF NOT EXISTS reference_docs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    storage_path TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2b. Document Chunks with Embeddings (used by RAG pipeline)
CREATE TABLE IF NOT EXISTS doc_chunks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    doc_id UUID REFERENCES reference_docs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    chunk_index INT,
    chunk_text TEXT,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2c. Questionnaire Runs
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

-- 2d. Questions & Answers
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2e. Documents table (used by n8n chat vector store)
CREATE TABLE IF NOT EXISTS documents (
    id BIGSERIAL PRIMARY KEY,
    content TEXT,
    metadata JSONB,
    embedding VECTOR(1536)
);


-- ============================================================
-- STEP 3: Safe Column Additions (for existing databases)
-- ============================================================
-- If tables already exist without these columns, add them:
ALTER TABLE qa_pairs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE qa_pairs ADD COLUMN IF NOT EXISTS edited_answer TEXT;
ALTER TABLE qa_pairs ADD COLUMN IF NOT EXISTS evidence_snippets JSONB DEFAULT '[]';
ALTER TABLE qa_pairs ADD COLUMN IF NOT EXISTS is_found BOOLEAN DEFAULT TRUE;


-- ============================================================
-- STEP 4: Triggers
-- ============================================================

-- Auto-update updated_at on qa_pairs modification
CREATE OR REPLACE FUNCTION update_qa_pairs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_qa_pairs_updated_at ON qa_pairs;
CREATE TRIGGER trg_qa_pairs_updated_at
    BEFORE UPDATE ON qa_pairs
    FOR EACH ROW
    EXECUTE FUNCTION update_qa_pairs_updated_at();


-- ============================================================
-- STEP 5: Vector Search Functions
-- ============================================================

-- 5a. match_chunks — used by FastAPI RAG pipeline (services/rag.py)
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

-- 5b. match_documents — used by n8n Supabase vector store (chat feature)
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding VECTOR(1536),
    match_count INT DEFAULT NULL,
    filter JSONB DEFAULT '{}'
)
RETURNS TABLE (
    id BIGINT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql AS $$
#variable_conflict use_column
BEGIN
    RETURN QUERY
    SELECT
        id,
        content,
        metadata,
        1 - (documents.embedding <=> query_embedding) AS similarity
    FROM documents
    WHERE metadata @> filter
    ORDER BY documents.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


-- ============================================================
-- STEP 6: Row Level Security (RLS)
-- ============================================================

ALTER TABLE reference_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_pairs ENABLE ROW LEVEL SECURITY;

-- RLS Policies — users can only access their own data
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

-- Service role bypass — allows FastAPI (using service key) to bypass RLS
-- This is automatic in Supabase when using the service_role key.
-- No additional policy needed.


-- ============================================================
-- STEP 7: Performance Indexes
-- ============================================================

-- Vector similarity search index (IVFFlat)
CREATE INDEX IF NOT EXISTS idx_doc_chunks_embedding ON doc_chunks
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Lookup indexes
CREATE INDEX IF NOT EXISTS idx_doc_chunks_user_id ON doc_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_runs_user_id ON runs(user_id);
CREATE INDEX IF NOT EXISTS idx_qa_pairs_run_id ON qa_pairs(run_id);
CREATE INDEX IF NOT EXISTS idx_reference_docs_user_id ON reference_docs(user_id);


-- ============================================================
-- STEP 8: Verification — Run this to confirm everything is set up
-- ============================================================
-- Uncomment and run these SELECT queries to verify:

-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;
-- SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public';
