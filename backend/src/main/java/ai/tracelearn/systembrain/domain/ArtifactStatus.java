package ai.tracelearn.systembrain.domain;

/**
 * Lifecycle states for artifact generation.
 *
 * PENDING    — placeholder row created, generation not yet started
 * GENERATING — AI Agent is producing the artifacts, S3 upload in progress
 * COMPLETED  — all artifacts uploaded to S3, URLs stored in DB
 * FAILED     — generation or upload failed, see logs for reason
 */
public enum ArtifactStatus {
    PENDING,
    GENERATING,
    COMPLETED,
    FAILED
}