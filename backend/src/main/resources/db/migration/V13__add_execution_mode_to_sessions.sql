-- V13: Add execution mode and framework hint to sessions table
--
-- execution_mode:
--   Controls pipeline routing. LIVE_EXECUTION = run in sandbox (default).
--   LOG_ANALYSIS = skip sandbox, send logs directly to AI Agent.
--   VARCHAR(30) matches Java enum name length. NOT NULL with default = safe migration.
--
-- framework_hint:
--   Optional. Populated when execution_mode = LOG_ANALYSIS.
--   Tells the AI Agent which framework-specific prompt to use.
--   Values: 'springboot', 'fastapi', 'django', 'express', 'nestjs', 'react'
--   Nullable — not needed for LIVE_EXECUTION sessions.

ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS execution_mode VARCHAR(30) NOT NULL DEFAULT 'LIVE_EXECUTION',
    ADD COLUMN IF NOT EXISTS framework_hint VARCHAR(50);

COMMENT ON COLUMN sessions.execution_mode IS
    'Pipeline routing: LIVE_EXECUTION (sandbox + AI) or LOG_ANALYSIS (AI only). '
    'LOG_ANALYSIS skips the sandbox for framework-based projects (Spring Boot, FastAPI etc).';

COMMENT ON COLUMN sessions.framework_hint IS
    'Framework identifier used to select framework-specific AI prompt. '
    'Populated only when execution_mode = LOG_ANALYSIS. '
    'Values: springboot | fastapi | django | express | nestjs | react';

CREATE INDEX IF NOT EXISTS idx_sessions_execution_mode ON sessions(execution_mode);