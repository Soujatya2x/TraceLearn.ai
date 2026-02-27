-- V7: Create learning_metrics table
CREATE TABLE learning_metrics (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    concept_name     VARCHAR(150) NOT NULL,
    mastery_score    DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    encounter_count  INT NOT NULL DEFAULT 0,
    last_encountered TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ
);

CREATE INDEX idx_lm_user_id ON learning_metrics(user_id);
CREATE UNIQUE INDEX idx_lm_user_concept ON learning_metrics(user_id, concept_name);
