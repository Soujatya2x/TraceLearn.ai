package ai.tracelearn.systembrain.repository;

import ai.tracelearn.systembrain.domain.Session;
import ai.tracelearn.systembrain.domain.SessionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SessionRepository extends JpaRepository<Session, UUID> {

    Page<Session> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    /**
     * All sessions for a user ordered by most recent first — used for streak calculation.
     * Returns a plain List (no pagination) since streak logic needs the full history.
     */
    List<Session> findByUserIdOrderByCreatedAtDesc(UUID userId);

    /**
     * Single session detail — fetches attempts and analysis in one query.
     * Use for GET /api/v1/session/{id} where both collections are needed.
     * LEFT JOIN FETCH prevents N+1 when mapping executionAttempts and aiAnalysis.
     *
     * NOTE: Cannot paginate a JOIN FETCH query — correct for single-entity lookup.
     */
    @Query("""
            SELECT s FROM Session s
            LEFT JOIN FETCH s.executionAttempts
            LEFT JOIN FETCH s.aiAnalysis
            WHERE s.id = :sessionId
            """)
    Optional<Session> findByIdWithDetails(@Param("sessionId") UUID sessionId);

    /**
     * Paginated list — scalar columns only, no collection joins.
     * Used for GET /api/v1/session list view mapped to SessionSummaryResponse.
     * Returns Session rows without triggering lazy loading of attempts or analysis.
     */
    @Query("""
            SELECT s FROM Session s
            WHERE s.user.id = :userId
            ORDER BY s.createdAt DESC
            """)
    Page<Session> findSummariesByUserId(@Param("userId") UUID userId, Pageable pageable);

    List<Session> findByStatus(SessionStatus status);

    List<Session> findByUserIdAndStatusIn(UUID userId, List<SessionStatus> statuses);

    @Query("SELECT s FROM Session s WHERE s.createdAt < :cutoff AND s.status IN :statuses")
    List<Session> findStaleSessionsForCleanup(
            @Param("cutoff") Instant cutoff,
            @Param("statuses") List<SessionStatus> statuses
    );

    @Query("SELECT s FROM Session s WHERE s.status IN :statuses AND s.updatedAt < :cutoff")
    List<Session> findExpiredSessions(
            @Param("statuses") List<SessionStatus> statuses,
            @Param("cutoff") Instant cutoff
    );

    @Query("SELECT COUNT(s) FROM Session s WHERE s.user.id = :userId")
    long countByUserId(@Param("userId") UUID userId);

    long countByUserIdAndStatus(UUID userId, SessionStatus status);

    @Query("SELECT COUNT(s) FROM Session s WHERE s.user.id = :userId AND s.status IN :statuses")
    long countByUserIdAndStatusIn(@Param("userId") UUID userId,
                                  @Param("statuses") List<SessionStatus> statuses);
}