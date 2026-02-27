package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.domain.*;
import ai.tracelearn.systembrain.dto.SessionDetailResponse;
import ai.tracelearn.systembrain.dto.SessionStatusResponse;
import ai.tracelearn.systembrain.exception.ResourceNotFoundException;
import ai.tracelearn.systembrain.mapper.SessionMapper;
import ai.tracelearn.systembrain.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SessionService {

    private final SessionRepository sessionRepository;
    private final SessionMapper sessionMapper;

    @Transactional
    public Session createSession(User user, String language, String workspacePath,
                                  String originalCode, String originalLogs, String originalFilename) {
        Session session = Session.builder()
                .user(user)
                .language(language.toLowerCase())
                .status(SessionStatus.CREATED)
                .retryCount(0)
                .workspacePath(workspacePath)
                .originalCode(originalCode)
                .originalLogs(originalLogs)
                .originalFilename(originalFilename)
                .build();

        session = sessionRepository.save(session);
        log.info("Session created: {} for user: {}", session.getId(), user.getId());
        return session;
    }

    /**
     * Load a single session with executionAttempts and aiAnalysis eagerly fetched.
     * Uses JOIN FETCH — one query instead of 1 + N lazy loads.
     * Use this wherever toDetailResponse() / toDetailResponse() will be called.
     */
    @Transactional(readOnly = true)
    public Session getSessionEntity(UUID sessionId) {
        return sessionRepository.findByIdWithDetails(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session", "id", sessionId.toString()));
    }

    /**
     * Load a single session WITHOUT collections — for status/orchestration use
     * where aiAnalysis and executionAttempts are not needed.
     * Avoids JOIN FETCH overhead when only scalar fields are accessed.
     */
    @Transactional(readOnly = true)
    public Session getSessionEntityLean(UUID sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session", "id", sessionId.toString()));
    }

    @Transactional(readOnly = true)
    public SessionDetailResponse getSessionDetailResponse(UUID sessionId) {
        // findByIdWithDetails JOIN FETCHes attempts + analysis — no N+1
        Session session = getSessionEntity(sessionId);
        return sessionMapper.toDetailResponse(session);
    }

    /**
     * Paginated list — maps to SessionStatusResponse (scalar columns only).
     * findSummariesByUserId loads ONLY Session rows — no collection joins.
     * toStatusResponse maps NO lazy associations — zero extra queries.
     *
     * Before fix: 20 sessions × (1 attempts query + 1 analysis query) = 41 queries/page
     * After fix:  1 query total regardless of page size
     */
    @Transactional(readOnly = true)
    public Page<SessionStatusResponse> getUserSessions(UUID userId, Pageable pageable) {
        return sessionRepository.findSummariesByUserId(userId, pageable)
                .map(sessionMapper::toStatusResponse);
    }

    @Transactional
    public void updateSessionStatus(UUID sessionId, SessionStatus status) {
        Session session = getSessionEntityLean(sessionId);
        session.setStatus(status);
        sessionRepository.save(session);
        log.info("Session {} status updated to {}", sessionId, status);
    }

    @Transactional
    public void incrementRetryCount(UUID sessionId) {
        Session session = getSessionEntityLean(sessionId);
        session.setRetryCount(session.getRetryCount() + 1);
        sessionRepository.save(session);
        log.info("Session {} retry count incremented to {}", sessionId, session.getRetryCount());
    }

    @Transactional(readOnly = true)
    public int getRetryCount(UUID sessionId) {
        return getSessionEntityLean(sessionId).getRetryCount();
    }
}