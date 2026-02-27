ALTER TABLE ai_analysis
    ADD COLUMN IF NOT EXISTS concept_scores TEXT;

COMMENT ON COLUMN ai_analysis.concept_scores IS
    'JSON array of per-concept mastery scores from the AI Agent Learning Analyst Agent. '
    'Format: [{"concept":"error-handling","score":0.3}]. Nullable for legacy rows.';
