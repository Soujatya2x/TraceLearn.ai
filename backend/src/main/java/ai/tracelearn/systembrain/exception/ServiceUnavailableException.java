package ai.tracelearn.systembrain.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
public class ServiceUnavailableException extends RuntimeException {

    private final String serviceName;

    public ServiceUnavailableException(String serviceName, String message) {
        super(String.format("Service '%s' unavailable: %s", serviceName, message));
        this.serviceName = serviceName;
    }

    public ServiceUnavailableException(String serviceName, String message, Throwable cause) {
        super(String.format("Service '%s' unavailable: %s", serviceName, message), cause);
        this.serviceName = serviceName;
    }

    public String getServiceName() { return serviceName; }
}
