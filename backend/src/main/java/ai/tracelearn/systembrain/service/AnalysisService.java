package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.domain.AiAnalysis;
import ai.tracelearn.systembrain.domain.Session;
import ai.tracelearn.systembrain.dto.AiAnalysisResponse;
import ai.tracelearn.systembrain.integration.dto.AiAnalyzeResponse;
import ai.tracelearn.systembrain.mapper.SessionMapper;
import ai.tracelearn.systembrain.repository.AiAnalysisRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalysisService {

    private final AiAnalysisRepository aiAnalysisRepository;
    private final SessionMapper sessionMapper;
    private final ObjectMapper objectMapper;

    @Transactional
    public AiAnalysis saveAnalysis(Session session, AiAnalyzeResponse response) {
        AiAnalysis analysis = aiAnalysisRepository.findBySessionId(session.getId())
                .orElse(AiAnalysis.builder().session(session).build());

        analysis.setExplanation(response.getExplanation());
        analysis.setConceptBreakdown(response.getConceptBreakdown());
        analysis.setFixedCode(response.getFixedCode());
        analysis.setLearningSummary(response.getLearningSummary());
        analysis.setConfidenceScore(response.getConfidenceScore());
        analysis.setRetryRecommendation(response.isRetryRecommendation());
        analysis.setStackTrace(response.getStackTrace());
        analysis.setWhyItHappened(response.getWhyItHappened());
        analysis.setConceptBehindError(response.getConceptBehindError());

        // Serialize List<String> stepByStepReasoning as JSON array
        if (response.getStepByStepReasoning() != null) {
            try {
                analysis.setStepByStepReasoning(
                        objectMapper.writeValueAsString(response.getStepByStepReasoning()));
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize stepByStepReasoning for session {}", session.getId());
            }
        }

        // Serialize FixAnalysis object as JSON
        if (response.getFixAnalysis() != null) {
            try {
                analysis.setFixAnalysis(objectMapper.writeValueAsString(response.getFixAnalysis()));
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize fixAnalysis for session {}", session.getId());
            }
        }

        // Serialize List<LearningResource> as JSON (previously stored as pipe-delimited string)
        if (response.getLearningResources() != null) {
            try {
                analysis.setLearningResources(
                        objectMapper.writeValueAsString(response.getLearningResources()));
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize learningResources for session {}", session.getId());
            }
        }

        // Serialize List<SimilarError> as JSON
        if (response.getSimilarErrors() != null) {
            try {
                analysis.setSimilarErrors(objectMapper.writeValueAsString(response.getSimilarErrors()));
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize similarErrors for session {}", session.getId());
            }
        }

        if (response.getErrorDetail() != null) {
            analysis.setErrorType(response.getErrorDetail().getErrorType());
            analysis.setErrorFile(response.getErrorDetail().getErrorFile());
            analysis.setErrorLine(response.getErrorDetail().getErrorLine());
        }

        if (response.getConceptScores() != null && !response.getConceptScores().isEmpty()) {
            try {
                analysis.setConceptScores(objectMapper.writeValueAsString(response.getConceptScores()));
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize conceptScores for session {} — storing null: {}",
                        session.getId(), e.getMessage());
            }
        }

        analysis = aiAnalysisRepository.save(analysis);
        log.info("AI analysis saved for session {}", session.getId());
        return analysis;
    }

    @Transactional(readOnly = true)
    public Optional<AiAnalysisResponse> getAnalysis(UUID sessionId) {
        return aiAnalysisRepository.findBySessionId(sessionId)
                .map(sessionMapper::toAnalysisResponse);
    }

    @Transactional(readOnly = true)
    public Optional<AiAnalysis> getAnalysisEntity(UUID sessionId) {
        return aiAnalysisRepository.findBySessionId(sessionId);
    }
}