-- Fix: Add missing updated_at column to qa_pairs table
-- This fixes: 'record "new" has no field "updated_at"' error
-- Run this in your Supabase SQL Editor

-- Add the column if it doesn't exist
ALTER TABLE qa_pairs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Recreate the trigger function
CREATE OR REPLACE FUNCTION update_qa_pairs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trg_qa_pairs_updated_at ON qa_pairs;
CREATE TRIGGER trg_qa_pairs_updated_at
    BEFORE UPDATE ON qa_pairs
    FOR EACH ROW
    EXECUTE FUNCTION update_qa_pairs_updated_at();
