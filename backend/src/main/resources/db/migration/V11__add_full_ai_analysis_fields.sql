-- V11: Add missing AI analysis fields to ai_analysis table
--
-- These columns store the full AI Agent response contract fields
-- that were previously missing from AiAnalyzeResponse and therefore
-- never persisted. Required for AiArtifactsRequest to send complete
-- context to the artifact generation endpoint.

ALTER TABLE ai_analysis
    ADD COLUMN IF NOT EXISTS stack_trace         TEXT,
    ADD COLUMN IF NOT EXISTS why_it_happened     TEXT,
    ADD COLUMN IF NOT EXISTS concept_behind_error TEXT,
    ADD COLUMN IF NOT EXISTS step_by_step_reasoning TEXT,   -- JSON array of strings
    ADD COLUMN IF NOT EXISTS fix_analysis        TEXT,       -- JSON object {whatChanged, whyItWorks, reinforcedConcept}
    ADD COLUMN IF NOT EXISTS similar_errors      TEXT;       -- JSON array of {errorType, description, example}

-- learning_resources column already exists (V4) but was stored as pipe-delimited string.
-- It is now stored as JSON array of {title, url, type} objects.
-- Existing rows will have null or legacy pipe-delimited values — acceptable since
-- they predate this migration and will be re-populated on next analysis.
COMMENT ON COLUMN ai_analysis.learning_resources IS 'JSON array: [{title, url, type}]. Legacy rows may contain pipe-delimited strings.';
COMMENT ON COLUMN ai_analysis.step_by_step_reasoning IS 'JSON array of step strings from AI Agent';
COMMENT ON COLUMN ai_analysis.fix_analysis IS 'JSON object: {whatChanged, whyItWorks, reinforcedConcept}';
COMMENT ON COLUMN ai_analysis.similar_errors IS 'JSON array: [{errorType, description, example}]';