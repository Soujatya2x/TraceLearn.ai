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

/**
 * AWS S3 integration client for storing artifacts (PDFs, PPTs, summaries).
 * Provides upload, download, presigned URL generation, and deletion operations.
 */
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

            log.info("S3 client initialized for bucket: {}, region: {}",
                    appProperties.getAws().getS3().getBucketName(), region);
        } catch (Exception e) {
            log.warn("Failed to initialize S3 client: {}. S3 operations will be disabled.", e.getMessage());
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

    /**
     * Upload a file to S3.
     *
     * @param key         S3 object key
     * @param content     File content as byte array
     * @param contentType MIME type
     * @return S3 object URL
     */
    public String uploadFile(String key, byte[] content, String contentType) {
        if (s3Client == null) {
            log.warn("S3 client not initialized, skipping upload for key: {}", key);
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

            String url = String.format("https://%s.s3.%s.amazonaws.com/%s",
                    bucket, appProperties.getAws().getS3().getRegion(), key);

            log.info("File uploaded to S3: key={}, size={} bytes", key, content.length);
            return url;
        } catch (Exception e) {
            log.error("Failed to upload file to S3: key={}", key, e);
            throw new RuntimeException("S3 upload failed: " + e.getMessage(), e);
        }
    }

    /**
     * Upload a stream to S3.
     */
    public String uploadStream(String key, InputStream inputStream, long contentLength, String contentType) {
        if (s3Client == null) {
            log.warn("S3 client not initialized, skipping upload for key: {}", key);
            return null;
        }

        String bucket = appProperties.getAws().getS3().getBucketName();

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(contentType)
                    .build();

            s3Client.putObject(request, RequestBody.fromInputStream(inputStream, contentLength));

            String url = String.format("https://%s.s3.%s.amazonaws.com/%s",
                    bucket, appProperties.getAws().getS3().getRegion(), key);

            log.info("Stream uploaded to S3: key={}, size={} bytes", key, contentLength);
            return url;
        } catch (Exception e) {
            log.error("Failed to upload stream to S3: key={}", key, e);
            throw new RuntimeException("S3 upload failed: " + e.getMessage(), e);
        }
    }

    /**
     * Generate a presigned URL for downloading an artifact.
     *
     * @param key              S3 object key
     * @param expirationMinutes URL expiration in minutes
     * @return Presigned URL
     */
    public String generatePresignedUrl(String key, int expirationMinutes) {
        if (s3Presigner == null) {
            log.warn("S3 presigner not initialized, cannot generate URL for key: {}", key);
            return null;
        }

        String bucket = appProperties.getAws().getS3().getBucketName();

        try {
            GetObjectRequest getRequest = GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build();

            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(expirationMinutes))
                    .getObjectRequest(getRequest)
                    .build();

            PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
            String url = presignedRequest.url().toString();

            log.debug("Generated presigned URL for key={}, expires in {} minutes", key, expirationMinutes);
            return url;
        } catch (Exception e) {
            log.error("Failed to generate presigned URL for key={}", key, e);
            return null;
        }
    }

    /**
     * Delete an object from S3.
     */
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
            log.info("File deleted from S3: key={}", key);
        } catch (Exception e) {
            log.error("Failed to delete file from S3: key={}", key, e);
        }
    }

    /**
     * Generate a unique S3 key for an artifact.
     */
    public String generateArtifactKey(UUID sessionId, String artifactType, String extension) {
        return String.format("artifacts/%s/%s/%s.%s",
                sessionId, artifactType, UUID.randomUUID(), extension);
    }

    /**
     * Check if S3 is available.
     */
    public boolean isAvailable() {
        return s3Client != null && s3Presigner != null;
    }
}
