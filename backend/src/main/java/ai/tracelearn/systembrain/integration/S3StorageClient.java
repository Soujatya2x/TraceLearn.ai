package ai.tracelearn.systembrain.integration;

import ai.tracelearn.systembrain.config.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.InputStream;
import java.time.Duration;
import java.util.UUID;

@Slf4j
@Component
public class S3StorageClient {

    private final AppProperties appProperties;
    private S3Client s3Client;
    private S3Presigner s3Presigner;

    public S3StorageClient(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @PostConstruct
    public void init() {

        String region = appProperties.getAws().getS3().getRegion();

        if (region == null || region.isBlank()) {
            log.warn("S3 region not configured, S3 operations will be disabled");
            return;
        }

        try {

            this.s3Client = S3Client.builder()
                    .region(Region.of(region))
                    .credentialsProvider(DefaultCredentialsProvider.create())
                    .build();

            this.s3Presigner = S3Presigner.builder()
                    .region(Region.of(region))
                    .credentialsProvider(DefaultCredentialsProvider.create())
                    .build();

            log.info("S3 client initialized for bucket={}, region={}",
                    appProperties.getAws().getS3().getBucketName(),
                    region);

        } catch (Exception e) {
            log.warn("Failed to initialize S3 client: {}", e.getMessage());
        }
    }

    @PreDestroy
    public void destroy() {
        if (s3Client != null) {
            s3Client.close();
        }
        if (s3Presigner != null) {
            s3Presigner.close();
        }
    }

    /* ───────────────────────────────────────────── */

    public String uploadFile(String key, byte[] content, String contentType) {

        if (s3Client == null) {
            log.warn("S3 not initialized — upload skipped for key={}", key);
            return null;
        }

        String bucket = appProperties.getAws().getS3().getBucketName();

        try {

            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(contentType)
                    .build();

            s3Client.putObject(request, RequestBody.fromBytes(content));

            String url = String.format(
                    "https://%s.s3.%s.amazonaws.com/%s",
                    bucket,
                    appProperties.getAws().getS3().getRegion(),
                    key
            );

            log.info("Uploaded artifact to S3 key={} size={}B", key, content.length);

            return url;

        } catch (Exception e) {

            log.error("S3 upload failed for key={}", key, e);

            throw new RuntimeException("S3 upload failed", e);
        }
    }

    /* ───────────────────────────────────────────── */

    public String uploadStream(
            String key,
            InputStream inputStream,
            long contentLength,
            String contentType
    ) {

        if (s3Client == null) {
            log.warn("S3 not initialized — upload skipped for key={}", key);
            return null;
        }

        String bucket = appProperties.getAws().getS3().getBucketName();

        try {

            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(contentType)
                    .build();

            s3Client.putObject(
                    request,
                    RequestBody.fromInputStream(inputStream, contentLength)
            );

            String url = String.format(
                    "https://%s.s3.%s.amazonaws.com/%s",
                    bucket,
                    appProperties.getAws().getS3().getRegion(),
                    key
            );

            log.info("Uploaded stream to S3 key={} size={}B", key, contentLength);

            return url;

        } catch (Exception e) {

            log.error("S3 stream upload failed for key={}", key, e);

            throw new RuntimeException("S3 upload failed", e);
        }
    }

    /* ───────────────────────────────────────────── */
    /* FIXED — 24 hour presigned URLs               */
    /* ───────────────────────────────────────────── */

    public String generatePresignedUrl(String key, int expirationMinutes) {

        if (s3Presigner == null) {
            log.warn("S3 presigner not available for key={}", key);
            return null;
        }

        String bucket = appProperties.getAws().getS3().getBucketName();

        try {

            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build();

            GetObjectPresignRequest presignRequest =
                    GetObjectPresignRequest.builder()
                            .signatureDuration(Duration.ofHours(24)) // FIX
                            .getObjectRequest(getObjectRequest)
                            .build();

            PresignedGetObjectRequest presigned =
                    s3Presigner.presignGetObject(presignRequest);

            String url = presigned.url().toString();

            log.debug("Generated presigned URL key={} expiry=24h", key);

            return url;

        } catch (Exception e) {

            log.error("Presigned URL generation failed for key={}", key, e);

            return null;
        }
    }

    /* ───────────────────────────────────────────── */

    public void deleteFile(String key) {

        if (s3Client == null) {
            return;
        }

        String bucket = appProperties.getAws().getS3().getBucketName();

        try {

            DeleteObjectRequest request = DeleteObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build();

            s3Client.deleteObject(request);

            log.info("Deleted S3 object key={}", key);

        } catch (Exception e) {

            log.error("Failed to delete S3 object key={}", key, e);
        }
    }

    /* ───────────────────────────────────────────── */

    public String generateArtifactKey(
            UUID sessionId,
            String artifactType,
            String extension
    ) {

        return String.format(
                "artifacts/%s/%s/%s.%s",
                sessionId,
                artifactType,
                UUID.randomUUID(),
                extension
        );
    }

    public boolean isAvailable() {
        return s3Client != null && s3Presigner != null;
    }
}