package ai.tracelearn.systembrain.mapper;

import ai.tracelearn.systembrain.domain.ChatMessage;
import ai.tracelearn.systembrain.dto.ChatMessageResponse;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ChatMapper {

    ChatMessageResponse toResponse(ChatMessage message);

    List<ChatMessageResponse> toResponseList(List<ChatMessage> messages);
}
