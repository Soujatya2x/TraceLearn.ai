package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.config.AppProperties;
import ai.tracelearn.systembrain.domain.SessionStatus;
import ai.tracelearn.systembrain.exception.RateLimitExceededException;
import ai.tracelearn.systembrain.repository.SessionRepository;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.*;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Rate limiter for POST /api/v1/analyze.
 *
 * Two independent guards enforced on every request:
 *
 *  1. TOKEN BUCKET RATE LIMIT (Bucket4j + Caffeine)
 *     Per-user token bucket with two bandwidth windows:
 *       - Burst:  max 5 requests/minute  (short burst protection)
 *       - Hourly: max 30 requests/hour   (sustained abuse protection)
 *     Buckets are stored in a Caffeine in-memory cache.
 *     Each bucket auto-expires after 2 hours of inactivity → no memory leak.
 *     Limits are externalized via app.rate-limit.* in application.yml.
 *
 *  2. CONCURRENT SESSION LIMIT (DB query)
 *     Counts sessions in EXECUTING or ANALYZING state for the user.
 *     If >= maxConcurrentSessions, rejects the request immediately.
 *     Prevents sandbox/AI resource exhaustion even within rate window.
 *
 * Both limits are configurable via environment variables:
 *   RATE_LIMIT_PER_MINUTE, RATE_LIMIT_PER_HOUR, MAX_CONCURRENT_SESSIONS
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyzeRateLimiter {

    private final AppProperties appProperties;
    private final SessionRepository sessionRepository;

    /** Active statuses that count toward the concurrent session cap */
    private static final List<SessionStatus> ACTIVE_STATUSES = List.of(
            SessionStatus.CREATED,
            SessionStatus.EXECUTING,
            SessionStatus.ANALYZING
    );

    /** One bucket per userId — expires after 2 hours idle */
    private Cache<UUID, Bucket> bucketCache;

    @PostConstruct
    public void init() {
        bucketCache = Caffeine.newBuilder()
                .expireAfterAccess(2, TimeUnit.HOURS)
                .maximumSize(10_000) // cap memory — handles ~10k concurrent users
                .build();
    }

    /**
     * Check both rate limit and concurrent session limit for a user.
     * Throws {@link RateLimitExceededException} (HTTP 429) if either limit is breached.
     * Returns silently if the request is allowed.
     *
     * @param userId the authenticated user's UUID
     */
    public void checkLimit(UUID userId) {
        checkTokenBucket(userId);
        checkConcurrentSessions(userId);
    }

    // ── Guard 1: Token bucket rate limit ─────────────────────────────────────

    private void checkTokenBucket(UUID userId) {
        Bucket bucket = bucketCache.get(userId, id -> createBucket());

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (!probe.isConsumed()) {
            long retryAfterSeconds = probe.getNanosToWaitForRefill() / 1_000_000_000L;

            log.warn("Rate limit exceeded for user {}: retryAfter={}s remaining={}",
                    userId, retryAfterSeconds, probe.getRemainingTokens());

            throw new RateLimitExceededException(
                    String.format(
                            "Too many analysis requests. You can submit up to %d requests per minute " +
                            "and %d per hour. Please wait %d seconds before retrying.",
                            appProperties.getRateLimit().getAnalyzeRequestsPerMinute(),
                            appProperties.getRateLimit().getAnalyzeRequestsPerHour(),
                            retryAfterSeconds),
                    retryAfterSeconds);
        }

        log.debug("Rate limit check passed for user {}: {} tokens remaining",
                userId, probe.getRemainingTokens());
    }

    // ── Guard 2: Concurrent session limit ────────────────────────────────────

    private void checkConcurrentSessions(UUID userId) {
        int maxConcurrent = appProperties.getRateLimit().getMaxConcurrentSessions();

        long activeSessions = sessionRepository.countByUserIdAndStatusIn(userId, ACTIVE_STATUSES);

        if (activeSessions >= maxConcurrent) {
            log.warn("Concurrent session limit exceeded for user {}: active={}, max={}",
                    userId, activeSessions, maxConcurrent);

            throw new RateLimitExceededException(
                    String.format(
                            "You already have %d active analysis session(s) in progress " +
                            "(maximum is %d). Please wait for a current session to complete " +
                            "before starting a new one.",
                            activeSessions, maxConcurrent),
                    60L); // suggest checking back in 60 seconds
        }
    }

    // ── Bucket factory ────────────────────────────────────────────────────────

    /**
     * Creates a new token bucket with two independent bandwidth limits.
     * Both must be satisfied — the more restrictive one wins on any given request.
     */
    private Bucket createBucket() {
        int perMinute = appProperties.getRateLimit().getAnalyzeRequestsPerMinute();
        int perHour   = appProperties.getRateLimit().getAnalyzeRequestsPerHour();

        return Bucket.builder()
                // Burst window: refills N tokens every 1 minute
                .addLimit(Bandwidth.builder()
                        .capacity(perMinute)
                        .refillGreedy(perMinute, Duration.ofMinutes(1))
                        .build())
                // Hourly window: refills N tokens every 1 hour
                .addLimit(Bandwidth.builder()
                        .capacity(perHour)
                        .refillGreedy(perHour, Duration.ofHours(1))
                        .build())
                .build();
    }
}