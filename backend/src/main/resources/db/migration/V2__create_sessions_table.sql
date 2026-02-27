-- V2: Create sessions table (core entity)
CREATE TABLE sessions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language          VARCHAR(30) NOT NULL,
    status            VARCHAR(30) NOT NULL DEFAULT 'CREATED',
    retry_count       INT NOT NULL DEFAULT 0,
    workspace_path    VARCHAR(512) NOT NULL,
    original_code     TEXT,
    original_logs     TEXT,
    original_filename VARCHAR(255),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);
