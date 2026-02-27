package ai.tracelearn.systembrain.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "learning_metrics", indexes = {
        @Index(name = "idx_lm_user_id", columnList = "user_id"),
        @Index(name = "idx_lm_user_concept", columnList = "user_id, concept_name", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LearningMetric extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "concept_name", nullable = false, length = 150)
    private String conceptName;

    @Column(name = "mastery_score", nullable = false)
    @Builder.Default
    private Double masteryScore = 0.0;

    @Column(name = "encounter_count", nullable = false)
    @Builder.Default
    private int encounterCount = 0;

    @Column(name = "last_encountered")
    private Instant lastEncountered;
}
