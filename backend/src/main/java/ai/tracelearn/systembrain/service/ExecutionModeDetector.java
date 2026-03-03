package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.domain.ExecutionMode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Determines whether a session should use LIVE_EXECUTION or LOG_ANALYSIS mode.
 *
 * Detection priority (first match wins):
 *   1. Explicit frameworkType from user (always trusted — user knows their own stack)
 *   2. Log file content contains framework signatures (Spring Boot, FastAPI, etc.)
 *   3. Uploaded filename is a build/config file (pom.xml, requirements.txt, etc.)
 *   4. Default → LIVE_EXECUTION (current behaviour, unchanged)
 *
 * This service is stateless — no DB calls, no I/O. Pure logic, fully testable.
 */
@Slf4j
@Service
public class ExecutionModeDetector {

    // ─── Framework type → canonical hint value ───────────────────────────────

    private static final Set<String> SUPPORTED_FRAMEWORKS = Set.of(
            "springboot", "fastapi", "django", "express", "nestjs", "react"
    );

    // ─── Log content signatures ───────────────────────────────────────────────
    // Maps each log signature to the framework hint it implies.
    // Checked case-insensitively against the full log content.

    private static final List<Map.Entry<String, String>> LOG_SIGNATURES = List.of(
            // Spring Boot / Spring ecosystem
            Map.entry("org.springframework",                "springboot"),
            Map.entry("BeanCreationException",              "springboot"),
            Map.entry("BeanDefinitionStoreException",       "springboot"),
            Map.entry("NoSuchBeanDefinitionException",      "springboot"),
            Map.entry("HibernateException",                 "springboot"),
            Map.entry("jakarta.persistence",                "springboot"),
            Map.entry("javax.persistence",                  "springboot"),
            Map.entry("DataIntegrityViolationException",    "springboot"),
            Map.entry("at com.netflix",                     "springboot"),  // Spring Cloud
            Map.entry("APPLICATION FAILED TO START",        "springboot"),
            Map.entry("Spring Boot",                        "springboot"),

            // FastAPI / Uvicorn
            Map.entry("fastapi",                            "fastapi"),
            Map.entry("uvicorn",                            "fastapi"),
            Map.entry("pydantic.error_wrappers",            "fastapi"),
            Map.entry("pydantic_core",                      "fastapi"),
            Map.entry("starlette",                          "fastapi"),
            Map.entry("ValidationError",                    "fastapi"),     // Pydantic
            Map.entry("RequestValidationError",             "fastapi")
    );

    // ─── Build/config filenames → framework hint ─────────────────────────────

    private static final Map<String, String> BUILD_FILE_HINTS = Map.of(
            "pom.xml",             "springboot",
            "build.gradle",        "springboot",
            "build.gradle.kts",    "springboot",
            "settings.gradle",     "springboot",
            "requirements.txt",    "fastapi",    // could be FastAPI/Django — best guess
            "pyproject.toml",      "fastapi",
            "package.json",        "express",
            "package-lock.json",   "express"
    );

    // ─── Public API ──────────────────────────────────────────────────────────

    /**
     * Detects the correct execution mode for a new session.
     *
     * @param explicitFrameworkType User-supplied framework type from UI (may be null)
     * @param filename              Original code filename (may be null)
     * @param logContent            Log file content (may be null)
     * @return DetectionResult containing mode + framework hint (never null)
     */
    public DetectionResult detect(String explicitFrameworkType,
                                   String filename,
                                   String logContent) {

        // ── Priority 1: Explicit user selection ──────────────────────────────
        if (explicitFrameworkType != null && !explicitFrameworkType.isBlank()) {
            String normalized = explicitFrameworkType.toLowerCase().trim();
            if (SUPPORTED_FRAMEWORKS.contains(normalized)) {
                log.debug("ExecutionModeDetector: explicit frameworkType='{}' → LOG_ANALYSIS",
                        normalized);
                return new DetectionResult(ExecutionMode.LOG_ANALYSIS, normalized, "explicit_user_selection");
            }
            log.warn("ExecutionModeDetector: unknown frameworkType='{}' — falling through to auto-detect",
                    explicitFrameworkType);
        }

        // ── Priority 2: Log content contains framework signatures ─────────────
        if (logContent != null && !logContent.isBlank()) {
            String lowerLog = logContent.toLowerCase();
            for (Map.Entry<String, String> entry : LOG_SIGNATURES) {
                if (lowerLog.contains(entry.getKey().toLowerCase())) {
                    log.debug("ExecutionModeDetector: log signature '{}' matched → LOG_ANALYSIS ({})",
                            entry.getKey(), entry.getValue());
                    return new DetectionResult(
                            ExecutionMode.LOG_ANALYSIS,
                            entry.getValue(),
                            "log_signature:" + entry.getKey()
                    );
                }
            }
        }

        // ── Priority 3: Build/config filename ────────────────────────────────
        if (filename != null && !filename.isBlank()) {
            String normalizedFilename = filename.toLowerCase().trim();
            for (Map.Entry<String, String> entry : BUILD_FILE_HINTS.entrySet()) {
                if (normalizedFilename.endsWith(entry.getKey())) {
                    log.debug("ExecutionModeDetector: build file '{}' matched → LOG_ANALYSIS ({})",
                            filename, entry.getValue());
                    return new DetectionResult(
                            ExecutionMode.LOG_ANALYSIS,
                            entry.getValue(),
                            "build_filename:" + entry.getKey()
                    );
                }
            }
        }

        // ── Default: LIVE_EXECUTION ───────────────────────────────────────────
        log.debug("ExecutionModeDetector: no signals matched → LIVE_EXECUTION");
        return new DetectionResult(ExecutionMode.LIVE_EXECUTION, null, "default");
    }

    // ─── Result type ─────────────────────────────────────────────────────────

    /**
     * Immutable result from detection.
     *
     * @param mode          LIVE_EXECUTION or LOG_ANALYSIS
     * @param frameworkHint "springboot", "fastapi", etc. — null for LIVE_EXECUTION
     * @param reason        Why this mode was chosen — for logging/debugging
     */
    public record DetectionResult(
            ExecutionMode mode,
            String frameworkHint,
            String reason
    ) {}
}