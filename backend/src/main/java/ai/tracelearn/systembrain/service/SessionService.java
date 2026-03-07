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
    private final WorkspaceService workspaceService;

    @Transactional
    public Session createSession(User user, String language, String workspacePath,
                                  String originalFilename,
                                  ExecutionMode executionMode,
                                  String frameworkHint) {
        // originalCode and originalLogs are no longer persisted to the DB (V15 migration).
        // They are stored on disk in the workspace (workspacePath/main.{ext} and logs.txt).
        Session session = Session.builder()
                .user(user)
                .language(language.toLowerCase())
                .status(SessionStatus.CREATED)
                .retryCount(0)
                .workspacePath(workspacePath)
                .originalFilename(originalFilename)
                .executionMode(executionMode)
                .frameworkHint(frameworkHint)
                .build();

        session = sessionRepository.save(session);
        log.info("Session created: {} for user: {} [mode={}, framework={}]",
                session.getId(), user.getId(), executionMode, frameworkHint);
        return session;
    }

    @Transactional(readOnly = true)
    public Session getSessionEntity(UUID sessionId) {
        return sessionRepository.findByIdWithDetails(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session", "id", sessionId.toString()));
    }

    @Transactional(readOnly = true)
    public Session getSessionEntityLean(UUID sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session", "id", sessionId.toString()));
    }

    /**
     * GET /api/v1/session/{sessionId}
     *
     * MapStruct maps all DB-backed fields automatically. originalCode / originalLogs
     * are NOT in the DB (removed in V15 migration) — they live on disk at workspacePath.
     * We read them here and set them on the response after MapStruct runs.
     */
    @Transactional(readOnly = true)
    public SessionDetailResponse getSessionDetailResponse(UUID sessionId) {
        Session session = getSessionEntity(sessionId);
        SessionDetailResponse response = sessionMapper.toDetailResponse(session);

        if (session.getWorkspacePath() != null) {
            String code = workspaceService.readCodeFile(
                    session.getWorkspacePath(), session.getLanguage());
            response.setOriginalCode(code);

            String logs = workspaceService.readLogFile(session.getWorkspacePath());
            if (logs != null && !logs.isBlank()) {
                response.setOriginalLogs(logs);
            }
        } else {
            log.warn("Session {} has no workspacePath — originalCode will be null", sessionId);
        }

        return response;
    }

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