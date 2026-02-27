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
 * Full roadmap response for GET /api/v1/roadmap/{userId}.
 *
 * Matches the frontend LearningRoadmap interface exactly:
 *   userId, conceptMastery[], knowledgeGaps[], recommendedTopics[],
 *   nextSteps[], analysisBasedOn, generatedAt
 *
 * Data sources:
 *   conceptMastery   — ALL LearningMetric rows for the user (mastery → percentage)
 *   knowledgeGaps    — subset of conceptMastery where masteryScore < 0.5
 *   recommendedTopics — AI Agent response, mapped to rich typed objects
 *   nextSteps         — derived from top knowledge gaps (one step per gap)
 *   analysisBasedOn  — total session count for the user
 *   generatedAt      — server-side Instant.now() at response build time
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RoadmapResponse {

    private UUID userId;

    /**
     * All tracked concepts for this user with mastery level, error frequency, and last seen.
     * Used to render the ConceptMasteryBar list and KnowledgeGapChart radar.
     */
    @Builder.Default
    private List<ConceptMastery> conceptMastery = Collections.emptyList();

    /**
     * Subset of conceptMastery where mastery is below threshold (< 50%).
     * Used to render the Priority Knowledge Gaps chip strip and inform the stats row.
     */
    @Builder.Default
    private List<ConceptMastery> knowledgeGaps = Collections.emptyList();

    /**
     * Personalized topic recommendations from the AI Agent.
     * Each has id, title, description, estimatedMinutes, priority, category, resourceLinks[].
     */
    @Builder.Default
    private List<RecommendedTopic> recommendedTopics = Collections.emptyList();

    /**
     * Actionable next steps — one per top knowledge gap, each with practice exercises.
     * Derived server-side from knowledge gaps when AI Agent doesn't return them.
     */
    @Builder.Default
    private List<NextStep> nextSteps = Collections.emptyList();

    /** Total sessions analyzed — shown in "Roadmap generated from N sessions" footer. */
    private long analysisBasedOn;

    /** ISO-8601 timestamp set at response build time — shown in the roadmap header. */
    private Instant generatedAt;

    // ── Nested: ConceptMastery ────────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConceptMastery {
        /** Maps to ConceptCategory in frontend: "Error Handling", "Async", etc. */
        private String category;
        /** 0–100 (masteryScore * 100, rounded). */
        private int masteryPercentage;
        /** Total times this concept was encountered across all sessions. */
        private int errorFrequency;
        /** ISO-8601 — last time this concept was triggered. */
        private Instant lastSeen;
    }

    // ── Nested: RecommendedTopic ──────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecommendedTopic {
        /** Stable ID for React key prop: "topic-<index>". */
        private String id;
        /** Human-readable topic name — maps to AI Agent topicName. */
        private String title;
        private String description;
        /** Minutes — parsed from AI Agent estimatedTime string (e.g. "25 minutes" → 25). */
        private int estimatedMinutes;
        /** "high" | "medium" | "low" — lowercased from AI Agent priority. */
        private String priority;
        /** Which concept category this topic addresses — inferred from concept name. */
        private String category;
        /** Resource links provided by the AI Agent for this topic. */
        @Builder.Default
        private List<TopicResource> resourceLinks = Collections.emptyList();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopicResource {
        private String title;
        private String url;
        /** "documentation" | "article" | "video" | "tutorial" */
        private String type;
        /** Hostname extracted from URL — shown as source label in resource cards. */
        private String source;
    }

    // ── Nested: NextStep ─────────────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NextStep {
        /** Stable ID for React key prop: "step-<index>". */
        private String id;
        /** Short imperative headline, e.g. "Fix your Async patterns first". */
        private String action;
        /** One sentence explaining why this step matters. */
        private String description;
        @Builder.Default
        private List<TopicResource> resourceLinks = Collections.emptyList();
        @Builder.Default
        private List<String> practiceExercises = Collections.emptyList();
    }
}