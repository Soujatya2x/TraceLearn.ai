package ai.tracelearn.systembrain.mapper;

import ai.tracelearn.systembrain.domain.AiAnalysis;
import ai.tracelearn.systembrain.domain.ExecutionAttempt;
import ai.tracelearn.systembrain.domain.Session;
import ai.tracelearn.systembrain.dto.AiAnalysisResponse;
import ai.tracelearn.systembrain.dto.ExecutionAttemptResponse;
import ai.tracelearn.systembrain.dto.SessionDetailResponse;
import ai.tracelearn.systembrain.dto.SessionStatusResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface SessionMapper {

    /**
     * Lightweight summary mapping — for paginated list view.
     * Maps ONLY scalar Session columns: no executionAttempts, no aiAnalysis.
     * Zero extra queries — no lazy loading triggered.
     * Used by: GET /api/v1/session (list)
     */
    @Mapping(source = "id", target = "sessionId")
    SessionStatusResponse toStatusResponse(Session session);

    /**
     * Full detail mapping — for single session detail view.
     * Maps all fields including originalCode, originalLogs, aiAnalysis, attempts.
     * Only call this after loading via SessionRepository.findByIdWithDetails()
     * (JOIN FETCH) — otherwise lazy loading triggers N+1 on each collection.
     * Used by: GET /api/v1/session/{id}, OrchestrationService, AsyncPipelineExecutor
     */
    @Mapping(source = "id", target = "sessionId")
    SessionDetailResponse toDetailResponse(Session session);

    ExecutionAttemptResponse toExecutionResponse(ExecutionAttempt attempt);

    List<ExecutionAttemptResponse> toExecutionResponseList(List<ExecutionAttempt> attempts);

    AiAnalysisResponse toAnalysisResponse(AiAnalysis analysis);
}