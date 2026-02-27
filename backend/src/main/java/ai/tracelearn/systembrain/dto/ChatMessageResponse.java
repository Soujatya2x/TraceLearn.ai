package ai.tracelearn.systembrain.dto;

import ai.tracelearn.systembrain.domain.ChatRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponse {

    private UUID id;
    private ChatRole role;
    private String message;
    private Instant timestamp;
}
