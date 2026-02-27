package ai.tracelearn.systembrain.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ai_analysis", indexes = {
        @Index(name = "idx_ai_analysis_session_id", columnList = "session_id", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiAnalysis extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false, unique = true)
    private Session session;

    @Column(name = "explanation", columnDefinition = "TEXT")
    private String explanation;

    @Column(name = "concept_breakdown", columnDefinition = "TEXT")
    private String conceptBreakdown;

    /**
     * Per-concept mastery scores from the AI Agent, stored as JSON.
     * Format: [{"concept":"error-handling","score":0.3},...]
     * Written by AnalysisService.saveAnalysis() via Jackson serialization.
     * Read back as-needed for audit/display — metric updates are applied
     * to LearningMetric rows at analysis time, not re-derived from this field.
     */
    @Column(name = "concept_scores", columnDefinition = "TEXT")
    private String conceptScores;

    @Column(name = "fixed_code", columnDefinition = "TEXT")
    private String fixedCode;

    @Column(name = "learning_summary", columnDefinition = "TEXT")
    private String learningSummary;

    @Column(name = "confidence_score")
    @Builder.Default
    private Double confidenceScore = 0.0;

    @Column(name = "error_type", length = 100)
    private String errorType;

    @Column(name = "error_file", length = 255)
    private String errorFile;

    @Column(name = "error_line")
    private Integer errorLine;

    @Column(name = "learning_resources", columnDefinition = "TEXT")
    private String learningResources;

    /** Stores the AI's whyItHappened explanation as TEXT */
    @Column(name = "why_it_happened", columnDefinition = "TEXT")
    private String whyItHappened;

    /** Stores the concept name behind the error, e.g. "Division by Zero" */
    @Column(name = "concept_behind_error", columnDefinition = "TEXT")
    private String conceptBehindError;

    /** Stores stepByStepReasoning as JSON array ["Step 1...", "Step 2..."] */
    @Column(name = "step_by_step_reasoning", columnDefinition = "TEXT")
    private String stepByStepReasoning;

    /** Stores fixAnalysis as JSON: {whatChanged, whyItWorks, reinforcedConcept} */
    @Column(name = "fix_analysis", columnDefinition = "TEXT")
    private String fixAnalysis;

    /** Stores similarErrors as JSON array */
    @Column(name = "similar_errors", columnDefinition = "TEXT")
    private String similarErrors;

    /** Stores the raw stackTrace string from AI response */
    @Column(name = "stack_trace", columnDefinition = "TEXT")
    private String stackTrace;

    @Column(name = "retry_recommendation", nullable = false)
    @Builder.Default
    private boolean retryRecommendation = false;
}