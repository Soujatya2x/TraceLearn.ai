-- V4: Create ai_analysis table
CREATE TABLE ai_analysis (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id            UUID NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
    explanation           TEXT,
    concept_breakdown     TEXT,
    fixed_code            TEXT,
    learning_summary      TEXT,
    confidence_score      DOUBLE PRECISION DEFAULT 0.0,
    error_type            VARCHAR(100),
    error_file            VARCHAR(255),
    error_line            INT,
    learning_resources    TEXT,
    retry_recommendation  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_ai_analysis_session_id ON ai_analysis(session_id);
