-- V3: Create execution_attempts table
CREATE TABLE execution_attempts (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id        UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    attempt_number    INT NOT NULL,
    stdout            TEXT,
    stderr            TEXT,
    exit_code         INT,
    execution_time_ms BIGINT,
    status            VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
    code_executed     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ
);

CREATE INDEX idx_exec_session_id ON execution_attempts(session_id);
CREATE UNIQUE INDEX idx_exec_attempt_number ON execution_attempts(session_id, attempt_number);
