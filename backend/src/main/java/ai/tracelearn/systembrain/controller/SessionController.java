package ai.tracelearn.systembrain.controller;

import ai.tracelearn.systembrain.domain.User;
import ai.tracelearn.systembrain.domain.Session;
import ai.tracelearn.systembrain.dto.*;
import ai.tracelearn.systembrain.dto.SessionStatusResponse;
import ai.tracelearn.systembrain.exception.ResourceNotFoundException;
import ai.tracelearn.systembrain.mapper.SessionMapper;
import ai.tracelearn.systembrain.repository.UserRepository;
import ai.tracelearn.systembrain.security.UserPrincipal;
import ai.tracelearn.systembrain.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Session lifecycle endpoints per the immutable API contract:
 *   GET  /api/v1/session/{sessionId}        - Get session state (execution, analysis, retries, status)
 *   POST /api/v1/session/{sessionId}/retry   - Retry execution with AI-fixed code
 *   GET  /api/v1/session/{sessionId}/attempts - Get all execution attempts
 *   GET  /api/v1/session/{sessionId}/analysis - Get AI analysis for a session
 *   GET  /api/v1/session                      - List user sessions (paginated)
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/session")
@RequiredArgsConstructor
public class SessionController {

    private final OrchestrationService orchestrationService;
    private final SessionService sessionService;
    private final ExecutionService executionService;
    private final AnalysisService analysisService;
    private final SessionMapper sessionMapper;
    private final UserRepository userRepository;

    /**
     * GET /api/v1/session/{sessionId}
     * Returns: execution state, analysis result, retry count, status.
     * Fetch this once when the session reaches a terminal state (ANALYZED, COMPLETED, ERROR).
     * Do NOT poll this endpoint — use /status for polling.
     */
    @GetMapping("/{sessionId}")
    public ResponseEntity<ApiResponse<SessionDetailResponse>> getSession(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID sessionId) {

        log.info("GET /api/v1/session/{} from user {}", sessionId, principal.getId());
        SessionDetailResponse response = sessionService.getSessionDetailResponse(sessionId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * GET /api/v1/session/{sessionId}/status
     * Lightweight polling endpoint — returns only sessionId, status, retryCount,
     * language, and timestamps. No code, logs, or analysis included.
     * Frontend should poll this during pipeline execution to check progress.
     */
    @GetMapping("/{sessionId}/status")
    public ResponseEntity<ApiResponse<SessionStatusResponse>> getSessionStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID sessionId) {

        log.debug("GET /api/v1/session/{}/status from user {}", sessionId, principal.getId());
        // Uses getSessionEntityLean — scalar columns only, no JOIN FETCH, zero collection queries
        Session session = sessionService.getSessionEntityLean(sessionId);
        return ResponseEntity.ok(ApiResponse.success(sessionMapper.toStatusResponse(session)));
    }

    /**
     * GET /api/v1/session
     * List sessions for the authenticated user with pagination.
     * Returns lightweight SessionStatusResponse — no collection data.
     * Frontend navigates to GET /session/{id} for full detail.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<SessionStatusResponse>>> getUserSessions(
            @AuthenticationPrincipal UserPrincipal principal,
            @PageableDefault(size = 20) Pageable pageable) {

        Page<SessionStatusResponse> sessions = sessionService.getUserSessions(principal.getId(), pageable);
        return ResponseEntity.ok(ApiResponse.success(sessions));
    }

    /**
     * POST /api/v1/session/{sessionId}/retry
     * Backend increments retry counter, reuses workspace, re-runs sandbox,
     * resends feedback to AI. Retry limit is configurable.
     */
    @PostMapping("/{sessionId}/retry")
    public ResponseEntity<ApiResponse<SessionDetailResponse>> retryExecution(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID sessionId) {

        User user = resolveUser(principal);
        log.info("POST /api/v1/session/{}/retry from user {}", sessionId, user.getId());

        SessionDetailResponse response = orchestrationService.retryExecution(sessionId, user);
        return ResponseEntity.ok(ApiResponse.success(response, "Retry executed"));
    }

    /**
     * GET /api/v1/session/{sessionId}/attempts
     * Retrieve all execution attempts for a session.
     */
    @GetMapping("/{sessionId}/attempts")
    public ResponseEntity<ApiResponse<List<ExecutionAttemptResponse>>> getAttempts(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID sessionId) {

        List<ExecutionAttemptResponse> attempts = executionService.getAttemptsBySession(sessionId)
                .stream()
                .map(sessionMapper::toExecutionResponse)
                .toList();

        return ResponseEntity.ok(ApiResponse.success(attempts));
    }

    /**
     * GET /api/v1/session/{sessionId}/analysis
     * Retrieve the AI analysis for a session.
     */
    @GetMapping("/{sessionId}/analysis")
    public ResponseEntity<ApiResponse<AiAnalysisResponse>> getAnalysis(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID sessionId) {

        AiAnalysisResponse analysis = analysisService.getAnalysis(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Analysis", "sessionId", sessionId.toString()));

        return ResponseEntity.ok(ApiResponse.success(analysis));
    }

    private User resolveUser(UserPrincipal principal) {
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", principal.getId().toString()));
    }
}