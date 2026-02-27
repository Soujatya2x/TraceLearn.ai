package ai.tracelearn.systembrain.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.util.UUID;

@ResponseStatus(HttpStatus.CONFLICT)
public class RetryLimitExceededException extends RuntimeException {

    /**
     * Called by OrchestrationService when only the limit count is available
     * (before sessionId context is known).
     */
    public RetryLimitExceededException(int maxRetries) {
        super(String.format("Maximum retry limit of %d has been reached for this session", maxRetries));
    }

    /**
     * Called when both sessionId and max retry count are available.
     */
    public RetryLimitExceededException(UUID sessionId, int maxRetries) {
        super(String.format("Session '%s' has exceeded the maximum retry limit of %d", sessionId, maxRetries));
    }
}