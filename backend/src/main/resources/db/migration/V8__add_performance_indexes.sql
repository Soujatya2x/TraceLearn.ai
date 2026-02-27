-- V8: Add performance indexes for scheduler queries and session lookups

-- Index for workspace cleanup scheduler (queries by status + updated_at)
CREATE INDEX IF NOT EXISTS idx_sessions_status_updated
    ON sessions(status, updated_at);

-- Index for user session count queries
CREATE INDEX IF NOT EXISTS idx_sessions_user_status
    ON sessions(user_id, status);

-- Index for execution attempt lookups by session and status
CREATE INDEX IF NOT EXISTS idx_exec_session_status
    ON execution_attempts(session_id, status);

-- Index for learning metrics ordered by mastery (for roadmap queries)
CREATE INDEX IF NOT EXISTS idx_lm_user_mastery
    ON learning_metrics(user_id, mastery_score);

-- Index for artifact generation status lookups
CREATE INDEX IF NOT EXISTS idx_artifacts_status
    ON artifacts(generation_status);
