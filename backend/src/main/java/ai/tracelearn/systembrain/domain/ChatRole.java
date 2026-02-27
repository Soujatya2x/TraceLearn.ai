package ai.tracelearn.systembrain.domain;

public enum ChatRole {
    USER,
    ASSISTANT,  // Used by ChatService.saveAssistantMessage() and OrchestrationService.processChat()
    SYSTEM      // Used for injected context messages
}