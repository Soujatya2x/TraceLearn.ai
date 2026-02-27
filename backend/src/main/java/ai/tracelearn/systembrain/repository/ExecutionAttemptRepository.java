package ai.tracelearn.systembrain.repository;

import ai.tracelearn.systembrain.domain.ExecutionAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExecutionAttemptRepository extends JpaRepository<ExecutionAttempt, UUID> {

    List<ExecutionAttempt> findBySessionIdOrderByAttemptNumberAsc(UUID sessionId);

    Optional<ExecutionAttempt> findBySessionIdAndAttemptNumber(UUID sessionId, int attemptNumber);

    Optional<ExecutionAttempt> findTopBySessionIdOrderByAttemptNumberDesc(UUID sessionId);

    long countBySessionId(UUID sessionId);
}
