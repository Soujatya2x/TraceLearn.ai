package ai.tracelearn.systembrain.controller;

import ai.tracelearn.systembrain.dto.ApiResponse;
import ai.tracelearn.systembrain.dto.ArtifactResponse;
import ai.tracelearn.systembrain.exception.BadRequestException;
import ai.tracelearn.systembrain.exception.ResourceNotFoundException;
import ai.tracelearn.systembrain.repository.SessionRepository;
import ai.tracelearn.systembrain.security.UserPrincipal;
import ai.tracelearn.systembrain.service.ArtifactService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Artifact endpoint per the immutable API contract:
 *   GET /api/v1/artifacts/{sessionId} - Return presigned S3 artifact URLs
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/artifacts")
@RequiredArgsConstructor
public class ArtifactController {

    private final ArtifactService artifactService;
    private final SessionRepository sessionRepository;

    /**
     * GET /api/v1/artifacts/{sessionId}
     *
     * Returns presigned S3 URLs for all generated artifacts (PDF, PPT, summary).
     * URLs are short-lived — clients must not cache them; re-fetch when needed.
     *
     * Ownership enforced: authenticated user must own the session.
     * Returns 404 if the session doesn't exist or artifacts are not yet generated.
     */
    @GetMapping("/{sessionId}")
    public ResponseEntity<ApiResponse<ArtifactResponse>> getArtifacts(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID sessionId) {

        log.info("GET /api/v1/artifacts/{} from user {}", sessionId, principal.getId());

        // ── Ownership check — users may only access their own session artifacts ──
        sessionRepository.findById(sessionId).ifPresentOrElse(
                session -> {
                    if (!session.getUser().getId().equals(principal.getId())) {
                        throw new BadRequestException("You do not own this session");
                    }
                },
                () -> { throw new ResourceNotFoundException("Session", "id", sessionId.toString()); }
        );

        // ── Fetch artifacts — URLs are presigned inside ArtifactService ──
        ArtifactResponse artifacts = artifactService.getArtifacts(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Artifacts", "sessionId", sessionId.toString()));

        return ResponseEntity.ok(ApiResponse.success(artifacts));
    }
}