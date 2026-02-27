package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.domain.LearningMetric;
import ai.tracelearn.systembrain.domain.User;
import ai.tracelearn.systembrain.integration.dto.AiAnalyzeResponse.ConceptScore;
import ai.tracelearn.systembrain.repository.LearningMetricRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class LearningMetricService {

    private final LearningMetricRepository learningMetricRepository;

    /**
     * PRIMARY — Update learning metrics using per-concept scores from the AI Agent.
     *
     * Called when AiAnalyzeResponse.conceptScores is non-empty.
     * The AI Agent's Learning Analyst Agent produces a score per concept
     * representing mastery demonstrated in THIS session (0.0–1.0).
     * These are applied directly via exponential moving average — the backend
     * never derives mastery from a single confidenceScore proxy.
     *
     * @param user           The user whose metrics to update
     * @param conceptScores  Per-concept scores from the Learning Analyst Agent
     */
    @Transactional
    public void updateMetricsFromScores(User user, List<ConceptScore> conceptScores) {
        if (conceptScores == null || conceptScores.isEmpty()) {
            return;
        }

        for (ConceptScore cs : conceptScores) {
            if (cs.getConcept() == null || cs.getConcept().isBlank()) {
                log.warn("Skipping ConceptScore with null/blank concept name for user {}", user.getId());
                continue;
            }

            String normalizedConcept = cs.getConcept().trim().toLowerCase();
            double sessionScore = Math.min(1.0, Math.max(0.0, cs.getScore())); // clamp to [0, 1]

            applyMasteryUpdate(user, normalizedConcept, sessionScore);
        }

        log.info("Updated {} concept metrics (from scores) for user {}",
                conceptScores.size(), user.getId());
    }

    /**
     * FALLBACK — Update learning metrics using concept names + a uniform confidence score.
     *
     * Called when AiAnalyzeResponse.conceptScores is absent but concepts + confidenceScore
     * are present. Applies the same score to every concept in the list.
     * Less accurate than updateMetricsFromScores() but ensures metrics always progress.
     *
     * @param user            The user whose metrics to update
     * @param concepts        Concept name list (no per-concept scores)
     * @param confidenceScore Uniform mastery delta applied to all concepts
     */
    @Transactional
    public void updateMetrics(User user, List<String> concepts, double confidenceScore) {
        if (concepts == null || concepts.isEmpty()) {
            return;
        }

        double clampedScore = Math.min(1.0, Math.max(0.0, confidenceScore));

        for (String concept : concepts) {
            if (concept == null || concept.isBlank()) {
                continue;
            }
            String normalizedConcept = concept.trim().toLowerCase();
            applyMasteryUpdate(user, normalizedConcept, clampedScore);
        }

        log.info("Updated {} concept metrics (fallback uniform score={}) for user {}",
                concepts.size(), clampedScore, user.getId());
    }

    /**
     * Get all learning metrics for a user.
     */
    @Transactional(readOnly = true)
    public List<LearningMetric> getUserMetrics(UUID userId) {
        return learningMetricRepository.findByUserIdOrderByMasteryScoreAsc(userId);
    }

    /**
     * Get weakest concepts (lowest mastery) for a user.
     */
    @Transactional(readOnly = true)
    public List<LearningMetric> getWeakestConcepts(UUID userId, int limit) {
        return learningMetricRepository.findByUserIdOrderByMasteryScoreAsc(userId)
                .stream()
                .limit(limit)
                .toList();
    }

    /**
     * Get strongest concepts (highest mastery) for a user.
     */
    @Transactional(readOnly = true)
    public List<LearningMetric> getStrongestConcepts(UUID userId, int limit) {
        return learningMetricRepository.findByUserIdOrderByMasteryScoreDesc(userId)
                .stream()
                .limit(limit)
                .toList();
    }

    /**
     * Get most recently encountered concepts.
     */
    @Transactional(readOnly = true)
    public List<LearningMetric> getRecentConcepts(UUID userId) {
        return learningMetricRepository.findByUserIdOrderByLastEncounteredDesc(userId);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Core mastery update — find-or-create the metric row and apply
     * exponential moving average with alpha=0.3.
     *
     * EMA formula: newMastery = (α × sessionScore) + ((1 - α) × currentMastery)
     *   α = 0.3 means recent sessions count for 30%, history for 70%.
     *   This prevents a single session from dominating the mastery score.
     */
    private void applyMasteryUpdate(User user, String normalizedConcept, double sessionScore) {
        LearningMetric metric = learningMetricRepository
                .findByUserIdAndConceptName(user.getId(), normalizedConcept)
                .orElse(LearningMetric.builder()
                        .user(user)
                        .conceptName(normalizedConcept)
                        .masteryScore(0.0)
                        .encounterCount(0)
                        .build());

        metric.setEncounterCount(metric.getEncounterCount() + 1);

        double alpha = 0.3;
        double newMastery = (alpha * sessionScore) + ((1 - alpha) * metric.getMasteryScore());
        metric.setMasteryScore(Math.min(1.0, Math.max(0.0, newMastery)));
        metric.setLastEncountered(Instant.now());

        learningMetricRepository.save(metric);
    }
}