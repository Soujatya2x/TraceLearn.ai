// package ai.tracelearn.systembrain.dto;

// import ai.tracelearn.systembrain.domain.SessionStatus;
// import lombok.AllArgsConstructor;
// import lombok.Builder;
// import lombok.Data;
// import lombok.NoArgsConstructor;

// import java.time.Instant;
// import java.util.UUID;

// /**
//  * Lightweight session DTO for list/paginated views.
//  *
//  * WHY THIS EXISTS — N+1 prevention:
//  *   SessionResponse includes executionAttempts (List) and aiAnalysis (object),
//  *   both mapped from lazy JPA associations. Mapping them in a loop over 20
//  *   sessions triggers 40 extra SELECT queries per page (N+1 problem).
//  *
//  *   This DTO contains ONLY scalar columns that are loaded as part of the
//  *   Session row itself — no joins, no lazy loading, zero extra queries.
//  *
//  * USED BY:
//  *   GET /api/v1/session  (paginated session list)
//  *
//  * NOT USED FOR:
//  *   GET /api/v1/session/{id}  — uses full SessionResponse with JOIN FETCH
//  */
// @Data
// @Builder
// @NoArgsConstructor
// @AllArgsConstructor
// public class SessionSummaryResponse {

//     private UUID sessionId;
//     private String language;
//     private SessionStatus status;
//     private int retryCount;
//     private String originalFilename;   // shown in list cards instead of full code
//     private Instant createdAt;
//     private Instant updatedAt;
// }