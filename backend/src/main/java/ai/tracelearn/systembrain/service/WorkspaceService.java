package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.config.AppProperties;
import ai.tracelearn.systembrain.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkspaceService {

    private final AppProperties appProperties;

    /**
     * Create workspace directory for a session.
     * Structure: {rootPath}/session-{uuid}/
     *   - main.{ext}
     *   - logs.txt
     *   - attempts/
     */
    public String createWorkspace(UUID sessionId, String code, String logs, String language) {
        validateSessionId(sessionId);
        validateLanguage(language);
        String workspacePath = getWorkspacePath(sessionId);
        Path workspace = Path.of(workspacePath);

        try {
            Files.createDirectories(workspace);
            Files.createDirectories(workspace.resolve("attempts"));

            String mainFile = resolveMainFilename(language);
            Files.writeString(workspace.resolve(mainFile), code, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);

            if (logs != null && !logs.isBlank()) {
                Files.writeString(workspace.resolve("logs.txt"), logs, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            }

            log.info("Workspace created for session {}: {}", sessionId, workspacePath);
            return workspacePath;
        } catch (IOException e) {
            log.error("Failed to create workspace for session {}", sessionId, e);
            throw new BadRequestException("Failed to create workspace: " + e.getMessage());
        }
    }

    /**
     * Update workspace with new code (for retry with AI-fixed code).
     */
    public void updateWorkspaceCode(UUID sessionId, String code, String language, int attemptNumber) {
        String workspacePath = getWorkspacePath(sessionId);
        Path workspace = Path.of(workspacePath);

        try {
            // Save to main file
            String mainFile = resolveMainFilename(language);
            Files.writeString(workspace.resolve(mainFile), code,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);

            // Archive attempt
            Path attemptsDir = workspace.resolve("attempts");
            Files.createDirectories(attemptsDir);
            Files.writeString(attemptsDir.resolve("attempt_" + attemptNumber + "." + resolveExtension(language)),
                    code, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);

            log.info("Workspace updated for session {} attempt {}", sessionId, attemptNumber);
        } catch (IOException e) {
            log.error("Failed to update workspace for session {}", sessionId, e);
            throw new BadRequestException("Failed to update workspace: " + e.getMessage());
        }
    }

    /**
     * Destroy workspace (cleanup).
     */
    public void destroyWorkspace(UUID sessionId) {
        String workspacePath = getWorkspacePath(sessionId);
        Path workspace = Path.of(workspacePath);

        if (!Files.exists(workspace)) {
            log.warn("Workspace does not exist for session {}: {}", sessionId, workspacePath);
            return;
        }

        try {
            Files.walkFileTree(workspace, new SimpleFileVisitor<>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    Files.delete(file);
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult postVisitDirectory(Path dir, IOException exc) throws IOException {
                    Files.delete(dir);
                    return FileVisitResult.CONTINUE;
                }
            });
            log.info("Workspace destroyed for session {}", sessionId);
        } catch (IOException e) {
            log.error("Failed to destroy workspace for session {}", sessionId, e);
        }
    }

    public String getWorkspacePath(UUID sessionId) {
        return appProperties.getWorkspace().getRootPath() + "/session-" + sessionId;
    }

    public boolean workspaceExists(UUID sessionId) {
        return Files.exists(Path.of(getWorkspacePath(sessionId)));
    }

    private String resolveMainFilename(String language) {
        return switch (language.toLowerCase()) {
            case "python" -> "main.py";
            case "java" -> "Main.java";
            case "javascript", "node" -> "index.js";
            case "go" -> "main.go";
            case "rust" -> "main.rs";
            default -> "main.txt";
        };
    }

    /**
     * Validate session ID to prevent path traversal attacks.
     */
    private void validateSessionId(UUID sessionId) {
        if (sessionId == null) {
            throw new BadRequestException("Session ID cannot be null");
        }
        // UUID format guarantees no path traversal characters
        String id = sessionId.toString();
        if (id.contains("..") || id.contains("/") || id.contains("\\")) {
            throw new BadRequestException("Invalid session ID format");
        }
    }

    /**
     * Validate language to prevent command injection via malicious language names.
     */
    private void validateLanguage(String language) {
        if (language == null || language.isBlank()) {
            throw new BadRequestException("Language cannot be empty");
        }
        String normalized = language.toLowerCase().trim();
        if (!normalized.matches("^[a-z0-9]+$")) {
            throw new BadRequestException("Invalid language format: " + language);
        }
    }

    private String resolveExtension(String language) {
        return switch (language.toLowerCase()) {
            case "python" -> "py";
            case "java" -> "java";
            case "javascript", "node" -> "js";
            case "go" -> "go";
            case "rust" -> "rs";
            default -> "txt";
        };
    }
}
