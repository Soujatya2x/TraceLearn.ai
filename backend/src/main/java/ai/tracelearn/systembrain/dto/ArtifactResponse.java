package ai.tracelearn.systembrain.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Full artifact response returned by GET /api/v1/artifacts/{sessionId}.
 *
 * Matches the frontend's ArtifactsResponse interface exactly:
 *   - sessionId
 *   - artifacts[]  — one entry per available file type (pdf / ppt / summary)
 *   - learningMetrics — user-level stats shown in the metrics row
 *
 * The backend stores the three URLs in a single Artifact row (pdfUrl, pptUrl, summaryUrl).
 * This response explodes them into typed ArtifactEntry objects so the frontend can render
 * each as an ArtifactCard with its own type badge, title, download button, etc.
 *
 * Only non-null URLs produce entries — if the AI Agent didn't generate a PPT,
 * no PPT entry appears in the array.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ArtifactResponse {

    private UUID sessionId;

    /** One entry per generated file. Never null — empty list when nothing generated yet. */
    @Builder.Default
    private List<ArtifactEntry> artifacts = Collections.emptyList();

    /** User-level learning stats displayed in the metrics row above the artifact grid. */
    private LearningMetricsDto learningMetrics;

    // ── Nested: one card in the artifact grid ────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ArtifactEntry {

        private String id;          // "<sessionId>-pdf" / "-ppt" / "-summary"
        private UUID sessionId;

        /**
         * Artifact type — drives icon, badge color, and filter chips in the UI.
         * Matches frontend ArtifactType: "pdf" | "ppt" | "summary"
         */
        private String type;

        private String title;
        private String description;

        /**
         * Presigned S3 URL — short-lived, do not cache.
         * Frontend uses this for both the Preview anchor and the Download button.
         * Field name is "s3Url" to match the frontend Artifact interface.
         */
        private String s3Url;

        /**
         * ISO-8601 timestamp.
         * Field name is "generatedAt" to match the frontend Artifact interface.
         * (Backend stores as "createdAt" on the Artifact entity — renamed here.)
         */
        private Instant generatedAt;

        /** File size in bytes — optional, shown as "204 KB" in the card footer. */
        private Long size;
    }

    // ── Nested: metrics row above the artifact grid ──────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LearningMetricsDto {

        /** Total number of sessions analyzed for this user. */
        private long totalErrorsAnalyzed;

        /** Number of distinct concept names encountered across all sessions. */
        private long conceptsCovered;

        /**
         * Percentage of sessions where the final execution attempt succeeded.
         * Computed as: completedSessions / totalSessions * 100 (0–100).
         */
        private double fixSuccessRate;

        /**
         * Consecutive days with at least one analyzed session.
         * Approximated from session createdAt timestamps.
         * Placeholder: returns 0 until a streak-tracking query is added.
         */
        private long learningStreakDays;
    }
}