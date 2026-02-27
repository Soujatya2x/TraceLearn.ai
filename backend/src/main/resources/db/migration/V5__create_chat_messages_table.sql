-- V5: Create chat_messages table
CREATE TABLE chat_messages (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role        VARCHAR(10) NOT NULL,
    message     TEXT NOT NULL,
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ
);

CREATE INDEX idx_chat_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_timestamp ON chat_messages(session_id, timestamp);
