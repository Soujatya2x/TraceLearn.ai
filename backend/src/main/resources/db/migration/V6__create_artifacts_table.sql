-- V6: Create artifacts table
CREATE TABLE artifacts (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id        UUID NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
    pdf_url           VARCHAR(1024),
    ppt_url           VARCHAR(1024),
    summary_url       VARCHAR(1024),
    generation_status VARCHAR(30) DEFAULT 'PENDING',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_artifacts_session_id ON artifacts(session_id);
