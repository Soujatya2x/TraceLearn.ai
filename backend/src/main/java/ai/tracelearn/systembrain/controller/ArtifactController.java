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
 * GET /api/v1/artifacts/{sessionId}
 *
 * Returns ArtifactResponse which matches the frontend's ArtifactsResponse interface:
 *   - artifacts[]     — one entry per file type (pdf / ppt / summary), presigned URLs
 *   - learningMetrics — user-level stats for the metrics row
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/artifacts")
@RequiredArgsConstructor
public class ArtifactController {

    private final ArtifactService artifactService;
    private final SessionRepository sessionRepository;

    @GetMapping("/{sessionId}")
    public ResponseEntity<ApiResponse<ArtifactResponse>> getArtifacts(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID sessionId) {

        log.info("GET /api/v1/artifacts/{} from user {}", sessionId, principal.getId());

        // ── Ownership check ──
        sessionRepository.findById(sessionId).ifPresentOrElse(
                session -> {
                    if (!session.getUser().getId().equals(principal.getId())) {
                        throw new BadRequestException("You do not own this session");
                    }
                },
                () -> { throw new ResourceNotFoundException("Session", "id", sessionId.toString()); }
        );

        ArtifactResponse response = artifactService.getArtifacts(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Artifacts", "sessionId", sessionId.toString()));

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}