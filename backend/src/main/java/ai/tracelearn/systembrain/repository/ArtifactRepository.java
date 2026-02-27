package ai.tracelearn.systembrain.repository;

import ai.tracelearn.systembrain.domain.Artifact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ArtifactRepository extends JpaRepository<Artifact, UUID> {

    Optional<Artifact> findBySessionId(UUID sessionId);

    boolean existsBySessionId(UUID sessionId);
}
