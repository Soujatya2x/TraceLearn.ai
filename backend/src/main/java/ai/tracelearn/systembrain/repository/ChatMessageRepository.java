package ai.tracelearn.systembrain.repository;

import ai.tracelearn.systembrain.domain.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    List<ChatMessage> findBySessionIdOrderByTimestampAsc(UUID sessionId);

    Page<ChatMessage> findBySessionId(UUID sessionId, Pageable pageable);

    Page<ChatMessage> findBySessionIdOrderByTimestampDesc(UUID sessionId, Pageable pageable);

    long countBySessionId(UUID sessionId);
}
