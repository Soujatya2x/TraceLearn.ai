package ai.tracelearn.systembrain.repository;

import ai.tracelearn.systembrain.domain.LearningMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LearningMetricRepository extends JpaRepository<LearningMetric, UUID> {

    // Used by: getUserMetrics(), getWeakestConcepts()
    List<LearningMetric> findByUserIdOrderByMasteryScoreAsc(UUID userId);

    // Used by: getStrongestConcepts()
    List<LearningMetric> findByUserIdOrderByMasteryScoreDesc(UUID userId);

    // Used by: getRecentConcepts()
    List<LearningMetric> findByUserIdOrderByLastEncounteredDesc(UUID userId);

    // Used by: updateMetrics() — find existing metric before upsert
    Optional<LearningMetric> findByUserIdAndConceptName(UUID userId, String conceptName);

    @Query("SELECT lm FROM LearningMetric lm WHERE lm.user.id = :userId ORDER BY lm.masteryScore ASC")
    List<LearningMetric> findWeakestConceptsByUserId(@Param("userId") UUID userId);

    @Query("SELECT lm FROM LearningMetric lm WHERE lm.user.id = :userId AND lm.masteryScore < :threshold")
    List<LearningMetric> findBelowThreshold(@Param("userId") UUID userId, @Param("threshold") double threshold);
}