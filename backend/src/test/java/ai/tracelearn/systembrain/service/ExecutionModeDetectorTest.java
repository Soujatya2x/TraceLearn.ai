package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.domain.ExecutionMode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for ExecutionModeDetector.
 *
 * Pure unit test — no Spring context, no database, no mocks.
 * ExecutionModeDetector is stateless (no dependencies), so it's instantiated directly.
 *
 * Coverage:
 *   Priority 1 — explicit frameworkType (user selection always wins)
 *   Priority 2 — log content signatures (Spring Boot, FastAPI keywords)
 *   Priority 3 — build filename heuristics (pom.xml, requirements.txt, etc.)
 *   Default     — LIVE_EXECUTION when no signals match
 *
 * Tests use @ParameterizedTest to cover the full set of supported frameworks
 * without duplicating test logic.
 */
@DisplayName("ExecutionModeDetector")
class ExecutionModeDetectorTest {

    private ExecutionModeDetector detector;

    @BeforeEach
    void setUp() {
        detector = new ExecutionModeDetector();
    }

    // ─── Priority 1: Explicit frameworkType ──────────────────────────────────

    @Nested
    @DisplayName("Priority 1 — explicit frameworkType")
    class ExplicitFrameworkType {

        @ParameterizedTest(name = "frameworkType={0} → LOG_ANALYSIS")
        @ValueSource(strings = {"springboot", "fastapi", "django", "express", "nestjs", "react"})
        @DisplayName("all supported frameworks return LOG_ANALYSIS")
        void explicitFramework_returnLogAnalysis(String framework) {
            ExecutionModeDetector.DetectionResult result =
                    detector.detect(framework, null, null);

            assertThat(result.mode()).isEqualTo(ExecutionMode.LOG_ANALYSIS);
            assertThat(result.frameworkHint()).isEqualTo(framework);
            assertThat(result.reason()).isEqualTo("explicit_user_selection");
        }

        @Test
        @DisplayName("frameworkType is case-insensitive (SpringBoot → springboot)")
        void explicitFramework_caseInsensitive() {
            // Note: AnalyzeController normalizes to lowercase before calling detect(),
            // but the detector itself also handles it for direct callers.
            ExecutionModeDetector.DetectionResult result =
                    detector.detect("springboot", null, null);

            assertThat(result.mode()).isEqualTo(ExecutionMode.LOG_ANALYSIS);
            assertThat(result.frameworkHint()).isEqualTo("springboot");
        }

        @Test
        @DisplayName("unknown frameworkType falls through to auto-detect, not an error")
        void explicitFramework_unknownFallsThrough() {
            // "rails" is not a supported framework — should NOT throw, should fall through
            ExecutionModeDetector.DetectionResult result =
                    detector.detect("rails", null, null);

            // Falls through to default (no log content, no filename)
            assertThat(result.mode()).isEqualTo(ExecutionMode.LIVE_EXECUTION);
            assertThat(result.frameworkHint()).isNull();
        }

        @Test
        @DisplayName("blank frameworkType is treated as absent")
        void explicitFramework_blank() {
            ExecutionModeDetector.DetectionResult result =
                    detector.detect("   ", null, null);

            assertThat(result.mode()).isEqualTo(ExecutionMode.LIVE_EXECUTION);
        }

        @Test
        @DisplayName("null frameworkType falls through to next priority")
        void explicitFramework_null() {
            ExecutionModeDetector.DetectionResult result =
                    detector.detect(null, null, null);

            assertThat(result.mode()).isEqualTo(ExecutionMode.LIVE_EXECUTION);
        }

        @Test
        @DisplayName("explicit frameworkType wins even when log content has no signals")
        void explicitFramework_overridesLogContent() {
            // Log content alone would return LIVE_EXECUTION (no signatures)
            // but explicit frameworkType always wins
            ExecutionModeDetector.DetectionResult result =
                    detector.detect("fastapi", "main.py", "hello world");

            assertThat(result.mode()).isEqualTo(ExecutionMode.LOG_ANALYSIS);
            assertThat(result.frameworkHint()).isEqualTo("fastapi");
        }
    }

    // ─── Priority 2: Log content signatures ──────────────────────────────────

    @Nested
    @DisplayName("Priority 2 — log content signatures")
    class LogContentSignatures {

        @ParameterizedTest(name = "signature={0} → framework={1}")
        @CsvSource({
            "org.springframework.BeanCreationException,                  springboot",
            "APPLICATION FAILED TO START,                                springboot",
            "BeanCreationException: Error creating bean with name,       springboot",
            "HibernateException: Unable to connect to database,          springboot",
            "jakarta.persistence.PersistenceException,                   springboot",
            "fastapi.exceptions.RequestValidationError,                  fastapi",
            "uvicorn.error - ASGI application,                           fastapi",
            "pydantic.error_wrappers.ValidationError,                    fastapi",
            "starlette.middleware.base called,                           fastapi",
        })
        @DisplayName("log signature detected correctly")
        void logSignature_detected(String logContent, String expectedFramework) {
            ExecutionModeDetector.DetectionResult result =
                    detector.detect(null, null, logContent.trim());

            assertThat(result.mode()).isEqualTo(ExecutionMode.LOG_ANALYSIS);
            assertThat(result.frameworkHint()).isEqualTo(expectedFramework.trim());
            assertThat(result.reason()).startsWith("log_signature:");
        }

        @Test
        @DisplayName("log content matching is case-insensitive")
        void logSignature_caseInsensitive() {
            // "Spring Boot" is in the signature list; testing uppercase log
            ExecutionModeDetector.DetectionResult result =
                    detector.detect(null, null, "SPRING BOOT APPLICATION CONTEXT FAILED");

            assertThat(result.mode()).isEqualTo(ExecutionMode.LOG_ANALYSIS);
        }

        @Test
        @DisplayName("empty log content does not match (no false positives)")
        void logSignature_emptyLog() {
            ExecutionModeDetector.DetectionResult result =
                    detector.detect(null, null, "");

            assertThat(result.mode()).isEqualTo(ExecutionMode.LIVE_EXECUTION);
        }

        @Test
        @DisplayName("generic log content with no framework keywords → LIVE_EXECUTION")
        void logSignature_noMatch() {
            ExecutionModeDetector.DetectionResult result =
                    detector.detect(null, null, "Error: division by zero at line 5");

            assertThat(result.mode()).isEqualTo(ExecutionMode.LIVE_EXECUTION);
        }
    }

    // ─── Priority 3: Build/config filename ───────────────────────────────────

    @Nested
    @DisplayName("Priority 3 — build/config filename")
    class BuildFilename {

        @ParameterizedTest(name = "filename={0} → framework={1}")
        @CsvSource({
            "pom.xml,             springboot",
            "build.gradle,        springboot",
            "build.gradle.kts,    springboot",
            "settings.gradle,     springboot",
            "requirements.txt,    fastapi",
            "pyproject.toml,      fastapi",
            "package.json,        express",
            "package-lock.json,   express",
        })
        @DisplayName("build filename detected correctly")
        void buildFilename_detected(String filename, String expectedFramework) {
            ExecutionModeDetector.DetectionResult result =
                    detector.detect(null, filename, null);

            assertThat(result.mode()).isEqualTo(ExecutionMode.LOG_ANALYSIS);
            assertThat(result.frameworkHint()).isEqualTo(expectedFramework.trim());
            assertThat(result.reason()).startsWith("build_filename:");
        }

        @Test
        @DisplayName("regular source filenames do not trigger LOG_ANALYSIS")
        void buildFilename_sourceFile_noMatch() {
            for (String filename : new String[]{"main.py", "Main.java", "index.js", "main.go", "main.rs"}) {
                ExecutionModeDetector.DetectionResult result =
                        detector.detect(null, filename, null);
                assertThat(result.mode())
                        .as("Expected LIVE_EXECUTION for " + filename)
                        .isEqualTo(ExecutionMode.LIVE_EXECUTION);
            }
        }
    }

    // ─── Priority ordering ────────────────────────────────────────────────────

    @Nested
    @DisplayName("Priority ordering")
    class PriorityOrdering {

        @Test
        @DisplayName("explicit frameworkType wins over log signature")
        void priority_explicitBeforeLog() {
            // Log contains FastAPI signature, but explicit says express
            ExecutionModeDetector.DetectionResult result =
                    detector.detect("express", null, "uvicorn.error fastapi startup");

            assertThat(result.frameworkHint()).isEqualTo("express");
            assertThat(result.reason()).isEqualTo("explicit_user_selection");
        }

        @Test
        @DisplayName("log signature wins over build filename")
        void priority_logBeforeFilename() {
            // Filename is pom.xml (Spring Boot), log contains FastAPI signature
            ExecutionModeDetector.DetectionResult result =
                    detector.detect(null, "pom.xml", "fastapi.exceptions.RequestValidationError");

            // Log content is checked before filename — fastapi wins
            assertThat(result.frameworkHint()).isEqualTo("fastapi");
            assertThat(result.reason()).startsWith("log_signature:");
        }
    }

    // ─── Default: LIVE_EXECUTION ──────────────────────────────────────────────

    @Nested
    @DisplayName("Default — LIVE_EXECUTION")
    class Default {

        @Test
        @DisplayName("returns LIVE_EXECUTION when all inputs are null")
        void default_allNull() {
            ExecutionModeDetector.DetectionResult result =
                    detector.detect(null, null, null);

            assertThat(result.mode()).isEqualTo(ExecutionMode.LIVE_EXECUTION);
            assertThat(result.frameworkHint()).isNull();
            assertThat(result.reason()).isEqualTo("default");
        }

        @Test
        @DisplayName("returns LIVE_EXECUTION for a plain Python script filename")
        void default_pythonFilename() {
            ExecutionModeDetector.DetectionResult result =
                    detector.detect(null, "solution.py", "Traceback (most recent call last):\n  File \"solution.py\", line 3");

            assertThat(result.mode()).isEqualTo(ExecutionMode.LIVE_EXECUTION);
            assertThat(result.reason()).isEqualTo("default");
        }
    }
}