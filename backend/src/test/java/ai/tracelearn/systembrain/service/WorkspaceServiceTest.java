package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.base.BaseIntegrationTest;
import ai.tracelearn.systembrain.exception.BadRequestException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests for WorkspaceService.
 *
 * Uses a real filesystem under /tmp — tests create and destroy actual directories.
 * Cleaned up in @AfterEach so tests leave no artifacts behind.
 *
 * Coverage:
 *   - createWorkspace: correct file structure, language-specific filenames
 *   - createWorkspace: validation (null sessionId, null/blank language)
 *   - readCodeFile: reads correct file, returns "" when missing
 *   - readLogFile: reads logs.txt when present, returns null when absent
 *   - destroyWorkspace: removes all files and directories
 *   - workspaceExists: true/false correctly
 */
@DisplayName("WorkspaceService")
class WorkspaceServiceTest extends BaseIntegrationTest {

    @Autowired
    private WorkspaceService workspaceService;

    private UUID testSessionId;

    @BeforeEach
    void setUpSession() {
        testSessionId = UUID.randomUUID();
    }

    @AfterEach
    void cleanWorkspace() {
        // Force cleanup even if the test didn't reach destroyWorkspace()
        if (workspaceService.workspaceExists(testSessionId)) {
            workspaceService.destroyWorkspace(testSessionId);
        }
    }

    // ─── createWorkspace ──────────────────────────────────────────────────────

    @Nested
    @DisplayName("createWorkspace")
    class CreateWorkspace {

        @ParameterizedTest(name = "language={0} → mainFile={1}")
        @CsvSource({
            "python,     main.py",
            "java,       Main.java",
            "javascript, index.js",
            "go,         main.go",
            "rust,       main.rs",
        })
        @DisplayName("creates correct main filename for each language")
        void create_correctMainFilename(String language, String expectedFilename) {
            String code = "// test code";
            String workspacePath = workspaceService.createWorkspace(
                    testSessionId, code, null, language);

            Path mainFile = Path.of(workspacePath).resolve(expectedFilename);
            assertThat(mainFile).exists();
            assertThat(mainFile).content().contains("// test code");
        }

        @Test
        @DisplayName("creates attempts/ subdirectory")
        void create_attemptsDirectoryCreated() {
            String workspacePath = workspaceService.createWorkspace(
                    testSessionId, "print('hi')", null, "python");

            assertThat(Path.of(workspacePath).resolve("attempts")).isDirectory();
        }

        @Test
        @DisplayName("writes logs.txt when log content provided")
        void create_withLogs() {
            String logContent = "ERROR: Connection refused";
            String workspacePath = workspaceService.createWorkspace(
                    testSessionId, "code", logContent, "python");

            Path logsFile = Path.of(workspacePath).resolve("logs.txt");
            assertThat(logsFile).exists();
            assertThat(logsFile).content().contains("ERROR: Connection refused");
        }

        @Test
        @DisplayName("does NOT create logs.txt when log content is null")
        void create_withoutLogs() {
            String workspacePath = workspaceService.createWorkspace(
                    testSessionId, "code", null, "python");

            assertThat(Path.of(workspacePath).resolve("logs.txt")).doesNotExist();
        }

        @Test
        @DisplayName("does NOT create logs.txt when log content is blank")
        void create_withBlankLogs() {
            String workspacePath = workspaceService.createWorkspace(
                    testSessionId, "code", "   ", "python");

            assertThat(Path.of(workspacePath).resolve("logs.txt")).doesNotExist();
        }

        @Test
        @DisplayName("throws BadRequestException for null language")
        void create_nullLanguage() {
            assertThatThrownBy(() ->
                    workspaceService.createWorkspace(testSessionId, "code", null, null))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Language cannot be empty");
        }

        @Test
        @DisplayName("throws BadRequestException for blank language")
        void create_blankLanguage() {
            assertThatThrownBy(() ->
                    workspaceService.createWorkspace(testSessionId, "code", null, "  "))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("throws BadRequestException for language with path traversal characters")
        void create_languageWithSpecialChars() {
            // Language "py../etc" would pass regex validation and fail — test the regex
            assertThatThrownBy(() ->
                    workspaceService.createWorkspace(testSessionId, "code", null, "py../etc"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Invalid language format");
        }

        @Test
        @DisplayName("throws BadRequestException for null sessionId")
        void create_nullSessionId() {
            assertThatThrownBy(() ->
                    workspaceService.createWorkspace(null, "code", null, "python"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Session ID cannot be null");
        }

        @Test
        @DisplayName("workspace path is deterministic: rootPath/session-{uuid}")
        void create_deterministicPath() {
            String path = workspaceService.createWorkspace(
                    testSessionId, "code", null, "python");

            assertThat(path).endsWith("session-" + testSessionId);
        }
    }

    // ─── readCodeFile ─────────────────────────────────────────────────────────

    @Nested
    @DisplayName("readCodeFile")
    class ReadCodeFile {

        @Test
        @DisplayName("reads code written by createWorkspace")
        void read_returnsContent() {
            String code = "def hello(): return 'world'";
            String workspacePath = workspaceService.createWorkspace(
                    testSessionId, code, null, "python");

            String read = workspaceService.readCodeFile(workspacePath, "python");
            assertThat(read).isEqualTo(code);
        }

        @Test
        @DisplayName("returns empty string when code file is missing")
        void read_missingFile_returnsEmpty() {
            // Workspace created but then code file deleted manually
            String workspacePath = workspaceService.createWorkspace(
                    testSessionId, "code", null, "python");

            Path mainFile = Path.of(workspacePath).resolve("main.py");
            try { Files.delete(mainFile); } catch (IOException ignored) {}

            String result = workspaceService.readCodeFile(workspacePath, "python");
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("returns empty string for a non-existent workspace path")
        void read_nonExistentPath_returnsEmpty() {
            String result = workspaceService.readCodeFile(
                    "/tmp/tracelearn-test-workspaces/session-does-not-exist", "python");
            assertThat(result).isEmpty();
        }
    }

    // ─── readLogFile ──────────────────────────────────────────────────────────

    @Nested
    @DisplayName("readLogFile")
    class ReadLogFile {

        @Test
        @DisplayName("reads logs.txt written by createWorkspace")
        void readLog_returnsContent() {
            String logs = "org.springframework.BeanCreationException at line 42";
            String workspacePath = workspaceService.createWorkspace(
                    testSessionId, "code", logs, "python");

            String read = workspaceService.readLogFile(workspacePath);
            assertThat(read).isEqualTo(logs);
        }

        @Test
        @DisplayName("returns null when logs.txt does not exist")
        void readLog_missingFile_returnsNull() {
            // No log content provided → logs.txt not created
            String workspacePath = workspaceService.createWorkspace(
                    testSessionId, "code", null, "python");

            String result = workspaceService.readLogFile(workspacePath);
            assertThat(result).isNull();
        }
    }

    // ─── destroyWorkspace ─────────────────────────────────────────────────────

    @Nested
    @DisplayName("destroyWorkspace")
    class DestroyWorkspace {

        @Test
        @DisplayName("removes all files and the workspace directory")
        void destroy_removesDirectory() {
            String workspacePath = workspaceService.createWorkspace(
                    testSessionId, "code", "logs", "python");

            assertThat(workspaceService.workspaceExists(testSessionId)).isTrue();

            workspaceService.destroyWorkspace(testSessionId);

            assertThat(workspaceService.workspaceExists(testSessionId)).isFalse();
            assertThat(Path.of(workspacePath)).doesNotExist();
        }

        @Test
        @DisplayName("does not throw when workspace does not exist")
        void destroy_nonExistent_noException() {
            // destroyWorkspace on a session that was never created — should be a no-op
            UUID neverCreated = UUID.randomUUID();
            // Must not throw
            workspaceService.destroyWorkspace(neverCreated);
        }
    }

    // ─── workspaceExists ──────────────────────────────────────────────────────

    @Nested
    @DisplayName("workspaceExists")
    class WorkspaceExists {

        @Test
        @DisplayName("returns false before creation")
        void exists_beforeCreate() {
            assertThat(workspaceService.workspaceExists(testSessionId)).isFalse();
        }

        @Test
        @DisplayName("returns true after creation")
        void exists_afterCreate() {
            workspaceService.createWorkspace(testSessionId, "code", null, "python");
            assertThat(workspaceService.workspaceExists(testSessionId)).isTrue();
        }

        @Test
        @DisplayName("returns false after destruction")
        void exists_afterDestroy() {
            workspaceService.createWorkspace(testSessionId, "code", null, "python");
            workspaceService.destroyWorkspace(testSessionId);
            assertThat(workspaceService.workspaceExists(testSessionId)).isFalse();
        }
    }
}