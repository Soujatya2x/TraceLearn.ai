package ai.tracelearn.systembrain.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a user exceeds the allowed request rate or concurrent session limit
 * on the /api/v1/analyze endpoint.
 *
 * Maps to HTTP 429 Too Many Requests.
 * The retryAfterSeconds field tells the client how long to wait.
 */
@ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
public class RateLimitExceededException extends RuntimeException {

    private final long retryAfterSeconds;

    public RateLimitExceededException(String message, long retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}