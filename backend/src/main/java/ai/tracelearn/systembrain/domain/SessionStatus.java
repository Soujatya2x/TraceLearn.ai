package ai.tracelearn.systembrain.domain;

/**
 * Lifecycle states for a session.
 *
 * CREATED    — session created, pipeline not yet started
 * EXECUTING  — code is running in the sandbox container
 * VALIDATING — AI-fixed code is being prepared for re-execution (retry flow only)
 * ANALYZING  — AI Agent is analyzing execution results
 * ANALYZED   — AI analysis complete, artifacts being generated
 * COMPLETED  — execution succeeded
 * FAILED     — execution failed with no further retries available
 * ERROR      — unexpected pipeline error (sandbox/AI agent unreachable, etc.)
 */
public enum SessionStatus {
    CREATED,
    EXECUTING,
    VALIDATING,
    ANALYZING,
    ANALYZED,
    COMPLETED,
    FAILED,
    ERROR
}