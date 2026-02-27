package ai.tracelearn.systembrain.scheduler;

import ai.tracelearn.systembrain.config.AppProperties;
import ai.tracelearn.systembrain.domain.SessionStatus;
import ai.tracelearn.systembrain.repository.SessionRepository;
import ai.tracelearn.systembrain.service.WorkspaceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Scheduled task to clean up old workspaces.
 * Runs periodically to remove workspace directories for sessions that have
 * been completed or errored beyond the configured max-age-hours.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WorkspaceCleanupScheduler {

    private final SessionRepository sessionRepository;
    private final WorkspaceService workspaceService;
    private final AppProperties appProperties;

    /**
     * Runs on the configured cron schedule (default: every 6 hours).
     * Cleans up workspaces for sessions older than maxAgeHours that are
     * in a terminal state (COMPLETED, ERROR, ANALYZED).
     */
    @Scheduled(cron = "${app.workspace.cleanup-cron:0 0 */6 * * *}")
    public void cleanupOldWorkspaces() {
        int maxAgeHours = appProperties.getWorkspace().getMaxAgeHours();
        Instant cutoffTime = Instant.now().minus(maxAgeHours, ChronoUnit.HOURS);

        log.info("Starting workspace cleanup. Removing workspaces older than {} hours (before {})",
                maxAgeHours, cutoffTime);

        List<SessionStatus> terminalStatuses = List.of(
                SessionStatus.COMPLETED,
                SessionStatus.ERROR,
                SessionStatus.ANALYZED
        );

        var expiredSessions = sessionRepository.findExpiredSessions(terminalStatuses, cutoffTime);

        int cleaned = 0;
        int failed = 0;

        for (var session : expiredSessions) {
            try {
                if (workspaceService.workspaceExists(session.getId())) {
                    workspaceService.destroyWorkspace(session.getId());
                    cleaned++;
                }
            } catch (Exception e) {
                log.error("Failed to clean up workspace for session {}", session.getId(), e);
                failed++;
            }
        }

        log.info("Workspace cleanup completed: {} cleaned, {} failed, {} total expired sessions",
                cleaned, failed, expiredSessions.size());
    }
}
