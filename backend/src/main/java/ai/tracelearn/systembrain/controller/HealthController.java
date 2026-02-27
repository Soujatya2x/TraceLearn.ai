package ai.tracelearn.systembrain.controller;

import ai.tracelearn.systembrain.dto.ApiResponse;
import ai.tracelearn.systembrain.integration.AiAgentClient;
import ai.tracelearn.systembrain.integration.S3StorageClient;
import ai.tracelearn.systembrain.integration.SandboxClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Health and status controller for the System Brain backend.
 * Provides aggregate health status of all downstream services.
 */
@RestController
@RequestMapping("/api/v1/health")
@RequiredArgsConstructor
public class HealthController {

    private final SandboxClient sandboxClient;
    private final AiAgentClient aiAgentClient;
    private final S3StorageClient s3StorageClient;

    /**
     * GET /api/v1/health
     * Returns the health status of System Brain and all downstream services.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> healthCheck() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("service", "tracelearn-system-brain");
        status.put("status", "UP");
        status.put("timestamp", Instant.now().toString());

        Map<String, String> dependencies = new LinkedHashMap<>();
        dependencies.put("sandbox", sandboxClient.isHealthy() ? "UP" : "DOWN");
        dependencies.put("aiAgent", aiAgentClient.isHealthy() ? "UP" : "DOWN");
        dependencies.put("s3", s3StorageClient.isAvailable() ? "AVAILABLE" : "NOT_CONFIGURED");

        status.put("dependencies", dependencies);

        return ResponseEntity.ok(ApiResponse.success(status));
    }

    /**
     * GET /api/v1/health/ping
     * Simple liveness probe.
     */
    @GetMapping("/ping")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("pong");
    }
}
