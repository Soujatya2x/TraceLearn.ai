package ai.tracelearn.systembrain.mapper;

import ai.tracelearn.systembrain.domain.AiAnalysis;
import ai.tracelearn.systembrain.domain.ExecutionAttempt;
import ai.tracelearn.systembrain.domain.Session;
import ai.tracelearn.systembrain.dto.AiAnalysisResponse;
import ai.tracelearn.systembrain.dto.ExecutionAttemptResponse;
import ai.tracelearn.systembrain.dto.SessionDetailResponse;
import ai.tracelearn.systembrain.dto.SessionStatusResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Collections;
import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public abstract class SessionMapper {

    private static final Logger log = LoggerFactory.getLogger(SessionMapper.class);

    /**
     * Injected by Spring — MapStruct abstract class components support @Autowired.
     * Used in toAnalysisResponse() to deserialize JSON TEXT columns.
     */
    @Autowired
    protected ObjectMapper objectMapper;

    // ── Session mappings ──────────────────────────────────────────────────────

    @Mapping(source = "id", target = "sessionId")
    public abstract SessionStatusResponse toStatusResponse(Session session);

    @Mapping(source = "id", target = "sessionId")
    public abstract SessionDetailResponse toDetailResponse(Session session);

    public abstract ExecutionAttemptResponse toExecutionResponse(ExecutionAttempt attempt);

    public abstract List<ExecutionAttemptResponse> toExecutionResponseList(List<ExecutionAttempt> attempts);

    // ── Analysis mapping — manual (MapStruct can't deserialize JSON TEXT columns) ──

    /**
     * Maps AiAnalysis entity → AiAnalysisResponse DTO.
     *
     * WHY MANUAL (not MapStruct @Mapping):
     *   The AiAnalysis entity stores stepByStepReasoning, fixAnalysis, learningResources,
     *   and similarErrors as JSON TEXT columns — raw strings like '["step1","step2"]'
     *   or '{"whatChanged":"..."}'. MapStruct has no built-in JSON deserializer.
     *
     *   This method uses Jackson to deserialize each JSON column into the correct
     *   typed inner class (List<String>, FixAnalysis, List<LearningResource>, etc.)
     *   before setting them on the response. Deserialization failures log a warning
     *   and fall back to null/empty so the rest of the response is still returned.
     *
     * Direct fields (no JSON involved):
     *   id, explanation, conceptBreakdown, fixedCode, learningSummary, confidenceScore,
     *   errorType, errorFile, errorLine, retryRecommendation, stackTrace,
     *   whyItHappened, conceptBehindError, createdAt
     */
    public AiAnalysisResponse toAnalysisResponse(AiAnalysis analysis) {
        if (analysis == null) return null;

        return AiAnalysisResponse.builder()
                .id(analysis.getId())
                .explanation(analysis.getExplanation())
                .stackTrace(analysis.getStackTrace())
                .whyItHappened(analysis.getWhyItHappened())
                .conceptBehindError(analysis.getConceptBehindError())
                .fixedCode(analysis.getFixedCode())
                .conceptBreakdown(analysis.getConceptBreakdown())
                .learningSummary(analysis.getLearningSummary())
                .confidenceScore(analysis.getConfidenceScore())
                .errorType(analysis.getErrorType())
                .errorFile(analysis.getErrorFile())
                .errorLine(analysis.getErrorLine())
                .retryRecommendation(analysis.isRetryRecommendation())
                .createdAt(analysis.getCreatedAt())
                // ── JSON TEXT columns deserialized below ──
                .stepByStepReasoning(deserializeList(
                        analysis.getStepByStepReasoning(),
                        new TypeReference<List<String>>() {},
                        "stepByStepReasoning", analysis.getId()))
                .fixAnalysis(deserializeObject(
                        analysis.getFixAnalysis(),
                        new TypeReference<AiAnalysisResponse.FixAnalysis>() {},
                        "fixAnalysis", analysis.getId()))
                .learningResources(deserializeList(
                        analysis.getLearningResources(),
                        new TypeReference<List<AiAnalysisResponse.LearningResource>>() {},
                        "learningResources", analysis.getId()))
                .similarErrors(deserializeList(
                        analysis.getSimilarErrors(),
                        new TypeReference<List<AiAnalysisResponse.SimilarError>>() {},
                        "similarErrors", analysis.getId()))
                .build();
    }

    // ── Private deserialization helpers ──────────────────────────────────────

    private <T> List<T> deserializeList(String json, TypeReference<List<T>> typeRef,
                                         String fieldName, Object entityId) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, typeRef);
        } catch (Exception e) {
            log.warn("Failed to deserialize {} for analysis {}: {}", fieldName, entityId, e.getMessage());
            return Collections.emptyList();
        }
    }

    private <T> T deserializeObject(String json, TypeReference<T> typeRef,
                                     String fieldName, Object entityId) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, typeRef);
        } catch (Exception e) {
            log.warn("Failed to deserialize {} for analysis {}: {}", fieldName, entityId, e.getMessage());
            return null;
        }
    }
}