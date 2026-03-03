package ai.tracelearn.systembrain.domain;

/**
 * Determines how a session's error analysis pipeline is routed.
 *
 * LIVE_EXECUTION:
 *   Default mode for standalone scripts and algorithms.
 *   Pipeline: code → Sandbox (Docker) → capture stdout/stderr → AI Agent analyze.
 *   Used for: Python scripts, single Java class, Node.js scripts, Go, Rust.
 *
 * LOG_ANALYSIS:
 *   Framework-aware mode. Sandbox is skipped entirely.
 *   Pipeline: code + log file → AI Agent directly → framework-aware analysis.
 *   Used for: Spring Boot, FastAPI, Django, Express, NestJS, React.
 *
 *   Why skip the sandbox?
 *   Framework projects require 50–200 dependencies, a running web server,
 *   and database connections. You cannot run a Spring Boot app in a throwaway
 *   Docker container per request — it would take 2–3 minutes and always fail.
 *   The developer's log file already contains the real error. The AI reads it directly.
 */
public enum ExecutionMode {

    /**
     * Run code in Docker sandbox, capture output, then analyze.
     * This is the current default flow — unchanged.
     */
    LIVE_EXECUTION,

    /**
     * Skip sandbox. Send code + log file directly to AI Agent.
     * AI uses framework-specific prompts (Spring Boot, FastAPI, etc.)
     * to diagnose the error from the log content.
     */
    LOG_ANALYSIS
}