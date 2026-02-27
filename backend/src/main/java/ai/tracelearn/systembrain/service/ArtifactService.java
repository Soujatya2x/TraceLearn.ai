package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.config.AppProperties;
import ai.tracelearn.systembrain.domain.Artifact;
import ai.tracelearn.systembrain.domain.ArtifactStatus;
import ai.tracelearn.systembrain.domain.Session;
import ai.tracelearn.systembrain.domain.SessionStatus;
import ai.tracelearn.systembrain.dto.ArtifactResponse;
import ai.tracelearn.systembrain.dto.ArtifactResponse.ArtifactEntry;
import ai.tracelearn.systembrain.dto.ArtifactResponse.LearningMetricsDto;
import ai.tracelearn.systembrain.integration.S3StorageClient;
import ai.tracelearn.systembrain.integration.dto.AiArtifactsResponse;
import ai.tracelearn.systembrain.repository.ArtifactRepository;
import ai.tracelearn.systembrain.repository.LearningMetricRepository;
import ai.tracelearn.systembrain.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ArtifactService {

    private final ArtifactRepository artifactRepository;
    private final SessionRepository sessionRepository;
    private final LearningMetricRepository learningMetricRepository;
    private final S3StorageClient s3StorageClient;
    private final AppProperties appProperties;

    // ── Write operations ─────────────────────────────────────────────────────

    /**
     * Create or update artifacts for a session from AI Agent response.
     * Stores raw S3 keys — presigning happens at read time in getArtifacts().
     */
    @Transactional
    public Artifact saveArtifacts(Session session, AiArtifactsResponse response) {
        Artifact artifact = artifactRepository.findBySessionId(session.getId())
                .orElse(Artifact.builder().session(session).build());

        artifact.setPdfUrl(response.getPdfUrl());
        artifact.setPptUrl(response.getPptUrl());
        artifact.setSummaryUrl(response.getSummaryUrl());
        artifact.setGenerationStatus(ArtifactStatus.COMPLETED);

        artifact = artifactRepository.save(artifact);
        log.info("Artifacts saved for session {}: pdf={}, ppt={}, summary={}",
                session.getId(),
                response.getPdfUrl() != null,
                response.getPptUrl() != null,
                response.getSummaryUrl() != null);
        return artifact;
    }

    /**
     * Create a pending artifact placeholder for a session.
     * Uses find-or-create to prevent UNIQUE CONSTRAINT violation on session_id.
     */
    @Transactional
    public Artifact createPending(Session session) {
        return artifactRepository.findBySessionId(session.getId())
                .orElseGet(() -> artifactRepository.save(
                        Artifact.builder()
                                .session(session)
                                .generationStatus(ArtifactStatus.PENDING)
                                .build()
                ));
    }

    /**
     * Mark artifact generation as failed.
     */
    @Transactional
    public void markFailed(UUID sessionId, String reason) {
        artifactRepository.findBySessionId(sessionId).ifPresentOrElse(
                artifact -> {
                    artifact.setGenerationStatus(ArtifactStatus.FAILED);
                    artifactRepository.save(artifact);
                    log.warn("Artifact generation marked FAILED for session {}: {}", sessionId, reason);
                },
                () -> log.warn("No artifact found for session {} to mark as failed", sessionId)
        );
    }

    // ── Read operations ──────────────────────────────────────────────────────

    /**
     * Get the full ArtifactResponse for GET /api/v1/artifacts/{sessionId}.
     *
     * Builds the shape the frontend's ArtifactsResponse interface requires:
     *   - artifacts[] — one ArtifactEntry per non-null URL (pdf / ppt / summary)
     *   - learningMetrics — user-level stats from LearningMetric + Session counts
     *
     * Each URL is presigned before being returned — raw S3 keys are never exposed.
     * Only URLs that are non-null produce an ArtifactEntry in the array.
     *
     * @param sessionId  the session whose artifacts to return
     * @return Optional.empty() if no Artifact row exists for this session
     */
    @Transactional(readOnly = true)
    public Optional<ArtifactResponse> getArtifacts(UUID sessionId) {
        return artifactRepository.findBySessionId(sessionId)
                .map(artifact -> {
                    int expiryMinutes = appProperties.getAws().getS3().getPresignedUrlExpiryMinutes();

                    // ── Build artifact entries ───────────────────────────
                    List<ArtifactEntry> entries = buildArtifactEntries(
                            artifact, sessionId, expiryMinutes);

                    // ── Build learning metrics ───────────────────────────
                    // Resolve the user from the session (LAZY — one extra query, worth it
                    // to avoid passing userId through the controller layer).
                    UUID userId = artifact.getSession().getUser().getId();
                    LearningMetricsDto metrics = buildLearningMetrics(userId);

                    return ArtifactResponse.builder()
                            .sessionId(sessionId)
                            .artifacts(entries)
                            .learningMetrics(metrics)
                            .build();
                });
    }

    /**
     * Check if artifacts for a session are ready (COMPLETED status).
     */
    @Transactional(readOnly = true)
    public boolean areArtifactsReady(UUID sessionId) {
        return artifactRepository.findBySessionId(sessionId)
                .map(a -> ArtifactStatus.COMPLETED == a.getGenerationStatus())
                .orElse(false);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Explode the single Artifact row's three URL fields into a typed list.
     * Only non-null / non-blank URLs produce an entry.
     * The generatedAt timestamp comes from the Artifact entity's createdAt (BaseEntity).
     */
    private List<ArtifactEntry> buildArtifactEntries(
            Artifact artifact, UUID sessionId, int expiryMinutes) {

        List<ArtifactEntry> entries = new ArrayList<>();

        if (artifact.getPdfUrl() != null && !artifact.getPdfUrl().isBlank()) {
            entries.add(ArtifactEntry.builder()
                    .id(sessionId + "-pdf")
                    .sessionId(sessionId)
                    .type("pdf")
                    .title("Error Explanation Report")
                    .description("Detailed PDF report with full explanation, root cause analysis, and recommended fix")
                    .s3Url(presign(artifact.getPdfUrl(), expiryMinutes))
                    .generatedAt(artifact.getCreatedAt())
                    .build());
        }

        if (artifact.getPptUrl() != null && !artifact.getPptUrl().isBlank()) {
            entries.add(ArtifactEntry.builder()
                    .id(sessionId + "-ppt")
                    .sessionId(sessionId)
                    .type("ppt")
                    .title("Learning Presentation")
                    .description("Slide deck covering the concepts behind this error pattern with visual diagrams")
                    .s3Url(presign(artifact.getPptUrl(), expiryMinutes))
                    .generatedAt(artifact.getCreatedAt())
                    .build());
        }

        if (artifact.getSummaryUrl() != null && !artifact.getSummaryUrl().isBlank()) {
            entries.add(ArtifactEntry.builder()
                    .id(sessionId + "-summary")
                    .sessionId(sessionId)
                    .type("summary")
                    .title("Session Learning Summary")
                    .description("Your personalized learning digest with all concepts covered and next steps")
                    .s3Url(presign(artifact.getSummaryUrl(), expiryMinutes))
                    .generatedAt(artifact.getCreatedAt())
                    .build());
        }

        return entries;
    }

    /**
     * Compute user-level learning metrics for the metrics row.
     *
     * totalErrorsAnalyzed  — total session count for the user
     * conceptsCovered      — distinct concepts tracked in LearningMetric
     * fixSuccessRate       — COMPLETED sessions / total sessions * 100
     * learningStreakDays   — placeholder 0 (streak logic needs timestamp analysis)
     */
    private LearningMetricsDto buildLearningMetrics(UUID userId) {
        long totalSessions = sessionRepository.countByUserId(userId);

        long completedSessions = sessionRepository.countByUserIdAndStatus(
                userId, SessionStatus.COMPLETED);

        long conceptCount = learningMetricRepository.findByUserIdOrderByMasteryScoreAsc(userId).size();

        double fixSuccessRate = totalSessions > 0
                ? Math.round((completedSessions * 100.0 / totalSessions) * 10.0) / 10.0
                : 0.0;

        return LearningMetricsDto.builder()
                .totalErrorsAnalyzed(totalSessions)
                .conceptsCovered(conceptCount)
                .fixSuccessRate(fixSuccessRate)
                .learningStreakDays(0L)   // TODO: implement streak from session createdAt timestamps
                .build();
    }

    private String presign(String rawUrl, int expiryMinutes) {
        if (rawUrl == null || rawUrl.isBlank()) return null;
        String key = extractS3Key(rawUrl);
        return s3StorageClient.generatePresignedUrl(key, expiryMinutes);
    }

    private String extractS3Key(String url) {
        if (url.startsWith("https://") && url.contains(".amazonaws.com/")) {
            return url.substring(url.indexOf(".amazonaws.com/") + ".amazonaws.com/".length());
        }
        return url;
    }
}