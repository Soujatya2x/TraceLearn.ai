package ai.tracelearn.systembrain.repository;

import ai.tracelearn.systembrain.domain.AiAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AiAnalysisRepository extends JpaRepository<AiAnalysis, UUID> {

    Optional<AiAnalysis> findBySessionId(UUID sessionId);

    boolean existsBySessionId(UUID sessionId);
}
