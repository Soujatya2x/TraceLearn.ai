package ai.tracelearn.systembrain.integration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request sent to the Sandbox microservice.
 *
 * The Sandbox mounts /workspace/session-{uuid}/ into the Docker container
 * and executes code directly from the filesystem — NOT from an inline code field.
 *
 * Required fields:
 *   sessionId     — identifies the execution job
 *   workspacePath — absolute path to the mounted workspace on the host
 *   language      — determines which runtime container to use
 *   timeout       — execution timeout in seconds
 *
 * NOTE: 'code' has been intentionally removed. The sandbox reads from the
 * workspace file, not from the request body. WorkspaceService.createWorkspace()
 * and WorkspaceService.updateWorkspaceCode() are responsible for ensuring the
 * correct code is written to disk before this request is sent.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SandboxExecuteRequest {

    private String sessionId;
    private String workspacePath;
    private String language;
    private int timeout;
}