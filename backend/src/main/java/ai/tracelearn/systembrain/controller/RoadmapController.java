package ai.tracelearn.systembrain.controller;

import ai.tracelearn.systembrain.domain.User;
import ai.tracelearn.systembrain.dto.ApiResponse;
import ai.tracelearn.systembrain.dto.RoadmapResponse;
import ai.tracelearn.systembrain.exception.ForbiddenException;
import ai.tracelearn.systembrain.exception.ResourceNotFoundException;
import ai.tracelearn.systembrain.repository.UserRepository;
import ai.tracelearn.systembrain.security.UserPrincipal;
import ai.tracelearn.systembrain.service.OrchestrationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Learning roadmap endpoint per the immutable API contract:
 *   GET /api/v1/roadmap/{userId} - Return knowledge-gap analytics for a user
 *   GET /api/v1/roadmap          - Convenience: roadmap for the authenticated user
 *
 * Ownership enforced: a user may only access their own roadmap.
 * Attempting to access another user's roadmap returns 403 Forbidden.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/roadmap")
@RequiredArgsConstructor
public class RoadmapController {

    private final OrchestrationService orchestrationService;
    private final UserRepository userRepository;

    /**
     * GET /api/v1/roadmap/{userId}
     *
     * Ownership check: authenticated user must match the requested userId.
     * Returns 403 Forbidden (not 400) — accessing another user's data is an
     * authorization failure, not a malformed request.
     * Returns 404 if the userId does not exist.
     */
    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<RoadmapResponse>> getRoadmapByUserId(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID userId) {

        // ── Ownership check ──
        if (!principal.getId().equals(userId)) {
            log.warn("Forbidden: user {} attempted to access roadmap of user {}",
                    principal.getId(), userId);
            throw new ForbiddenException("You can only access your own roadmap");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId.toString()));

        log.info("GET /api/v1/roadmap/{} for authenticated user {}", userId, principal.getId());
        RoadmapResponse roadmap = orchestrationService.generateRoadmap(user);
        return ResponseEntity.ok(ApiResponse.success(roadmap));
    }

    /**
     * GET /api/v1/roadmap
     *
     * Convenience endpoint — generates roadmap for the currently authenticated user.
     * No userId param needed; identity comes from the JWT principal.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<RoadmapResponse>> getRoadmap(
            @AuthenticationPrincipal UserPrincipal principal) {

        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User", "id", principal.getId().toString()));

        log.info("GET /api/v1/roadmap for authenticated user {}", user.getId());
        RoadmapResponse roadmap = orchestrationService.generateRoadmap(user);
        return ResponseEntity.ok(ApiResponse.success(roadmap));
    }
}