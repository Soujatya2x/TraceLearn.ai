package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.config.AppProperties;
import ai.tracelearn.systembrain.domain.Artifact;
import ai.tracelearn.systembrain.domain.ArtifactStatus;
import ai.tracelearn.systembrain.domain.Session;
import ai.tracelearn.systembrain.dto.ArtifactResponse;
import ai.tracelearn.systembrain.integration.S3StorageClient;
import ai.tracelearn.systembrain.integration.dto.AiArtifactsResponse;
import ai.tracelearn.systembrain.mapper.ArtifactMapper;
import ai.tracelearn.systembrain.repository.ArtifactRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ArtifactService {

    private final ArtifactRepository artifactRepository;
    private final ArtifactMapper artifactMapper;
    private final S3StorageClient s3StorageClient;
    private final AppProperties appProperties;

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
     * Get artifacts for a session with presigned S3 URLs.
     *
     * Raw S3 keys stored in the DB are never exposed directly to the client.
     * Each non-null URL field is passed through S3StorageClient.generatePresignedUrl()
     * which produces a short-lived HTTPS URL valid for the configured expiry window.
     */
    @Transactional(readOnly = true)
    public Optional<ArtifactResponse> getArtifacts(UUID sessionId) {
        return artifactRepository.findBySessionId(sessionId)
                .map(artifact -> {
                    ArtifactResponse response = artifactMapper.toResponse(artifact);

                    int expiryMinutes = appProperties.getAws().getS3().getPresignedUrlExpiryMinutes();
                    response.setPdfUrl(presign(artifact.getPdfUrl(), expiryMinutes));
                    response.setPptUrl(presign(artifact.getPptUrl(), expiryMinutes));
                    response.setSummaryUrl(presign(artifact.getSummaryUrl(), expiryMinutes));

                    return response;
                });
    }

    /**
     * Mark artifact generation as failed.
     */
    @Transactional
    public void markFailed(UUID sessionId, String reason) {
        Artifact artifact = artifactRepository.findBySessionId(sessionId)
                .orElse(null);

        if (artifact == null || artifact.getSession() == null) {
            log.warn("No artifact found for session {} to mark as failed", sessionId);
            return;
        }

        artifact.setGenerationStatus(ArtifactStatus.FAILED);
        artifactRepository.save(artifact);
        log.warn("Artifact generation marked FAILED for session {}: {}", sessionId, reason);
    }

    /**
     * Create a pending artifact placeholder for a session.
     * Uses find-or-create to prevent UNIQUE CONSTRAINT violation on session_id
     * if triggerArtifactGeneration() is called more than once.
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
     * Check if artifacts are ready.
     */
    @Transactional(readOnly = true)
    public boolean areArtifactsReady(UUID sessionId) {
        return artifactRepository.findBySessionId(sessionId)
                .map(a -> ArtifactStatus.COMPLETED == a.getGenerationStatus())
                .orElse(false);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private String presign(String rawUrl, int expiryMinutes) {
        if (rawUrl == null || rawUrl.isBlank()) {
            return null;
        }
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