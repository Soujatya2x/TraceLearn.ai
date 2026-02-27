package ai.tracelearn.systembrain.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

@Getter
@Setter
@Validated
@Configuration
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private final Jwt jwt = new Jwt();
    private final Workspace workspace = new Workspace();
    private final Sandbox sandbox = new Sandbox();
    private final AiAgent aiAgent = new AiAgent();
    private final Execution execution = new Execution();
    private final RateLimit rateLimit = new RateLimit();
    private final Aws aws = new Aws();
    private final Cors cors = new Cors();

    @Getter @Setter
    public static class Jwt {
        @NotBlank
        private String secret;
        @Positive
        private long expirationMs = 86400000;
        @Positive
        private long refreshExpirationMs = 604800000;
    }

    @Getter @Setter
    public static class Workspace {
        @NotBlank
        private String rootPath;
        private String cleanupCron;
        @Positive
        private int maxAgeHours = 24;
    }

    @Getter @Setter
    public static class Sandbox {
        @NotBlank
        private String baseUrl;
        private String executeEndpoint;
        @Positive
        private int defaultTimeout = 10;
        @Positive
        private int connectTimeoutMs = 5000;
        @Positive
        private int readTimeoutMs = 30000;
    }

    @Getter @Setter
    public static class AiAgent {
        @NotBlank
        private String baseUrl;
        private String analyzeEndpoint;
        private String chatEndpoint;
        private String artifactsEndpoint;
        private String roadmapEndpoint;
        @Positive
        private int connectTimeoutMs = 5000;
        @Positive
        private int readTimeoutMs = 60000;
    }

    @Getter @Setter
    public static class Execution {
        @Positive
        private int maxRetryCount = 3;
        @Positive
        private long maxFileSizeBytes = 5242880;
    }

    @Getter @Setter
    public static class RateLimit {
        /** Max analyze requests per user per minute */
        @Positive
        private int analyzeRequestsPerMinute = 5;
        /** Max analyze requests per user per hour */
        @Positive
        private int analyzeRequestsPerHour = 30;
        /** Max sessions a user can have in CREATED/EXECUTING/ANALYZING state simultaneously */
        @Positive
        private int maxConcurrentSessions = 3;
    }

    @Getter @Setter
    public static class Aws {
        private final S3 s3 = new S3();
        private final CloudWatch cloudwatch = new CloudWatch();

        @Getter @Setter
        public static class S3 {
            private String bucketName;
            private String region;
            @Positive
            private int presignedUrlExpiryMinutes = 60;
        }

        @Getter @Setter
        public static class CloudWatch {
            private String logGroup;
        }
    }

    @Getter @Setter
    public static class Cors {
        private String allowedOrigins;
    }
}