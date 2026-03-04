package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.config.AppProperties;
import ai.tracelearn.systembrain.domain.SessionStatus;
import ai.tracelearn.systembrain.exception.RateLimitExceededException;
import ai.tracelearn.systembrain.repository.SessionRepository;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.redis.lettuce.cas.LettuceBasedProxyManager;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.codec.ByteArrayCodec;
import io.lettuce.core.codec.RedisCodec;
import io.lettuce.core.codec.StringCodec;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

/**
 * Rate limiter for POST /api/v1/analyze.
 *
 * HIGH-5 FIX: Migrated from in-memory Caffeine cache to Redis-backed distributed
 * storage using Bucket4j's LettuceBasedProxyManager.
 *
 * Problem: With multiple backend instances behind a load balancer, each instance
 * had its own Caffeine cache. A user could exhaust the per-minute limit on
 * instance A, then immediately use instance B — the limit was per-instance, not
 * per-user across the cluster.
 *
 * Solution: All instances share a single Redis cluster. Each user's bucket state
 * (remaining tokens, last refill time) lives in Redis under key "rl:{userId}".
 * Bucket4j uses a Compare-And-Swap strategy for atomic updates — no distributed
 * lock needed, no race conditions.
 *
 * Two independent guards enforced on every request:
 *
 *  1. TOKEN BUCKET RATE LIMIT (Bucket4j + Redis/Lettuce)
 *     Per-user token bucket with two bandwidth windows:
 *       - Burst:  max 5 requests/minute  (short burst protection)
 *       - Hourly: max 30 requests/hour   (sustained abuse protection)
 *     Limits are configurable via app.rate-limit.* in application.yml /
 *     RATE_LIMIT_PER_MINUTE / RATE_LIMIT_PER_HOUR env vars.
 *
 *  2. CONCURRENT SESSION LIMIT (DB query — unchanged from before)
 *     Counts sessions in CREATED/EXECUTING/ANALYZING state for the user.
 *     Redis is not needed here — the DB is the source of truth for session state.
 *
 * Redis key: "rl:{userId}"  e.g. "rl:550e8400-e29b-41d4-a716-446655440000"
 * TTL: Bucket4j manages expiry automatically — keys disappear after the longer
 *      of the two refill windows (1 hour) once the bucket is fully replenished.
 *
 * Failure mode: If Redis is unreachable, tryConsumeAndReturnRemaining() throws
 * an exception which propagates as a 500. This is intentional — silently falling
 * back to in-memory would re-introduce the split-brain problem this fix solves.
 * Use Redis Sentinel or ElastiCache with automatic failover in production.
 */
@Slf4j
@Service
public class AnalyzeRateLimiter {

    private final AppProperties appProperties;
    private final SessionRepository sessionRepository;
    private final ProxyManager<String> proxyManager;

    /** Active statuses that count toward the concurrent session cap */
    private static final List<SessionStatus> ACTIVE_STATUSES = List.of(
            SessionStatus.CREATED,
            SessionStatus.EXECUTING,
            SessionStatus.ANALYZING
    );

    /** Redis key prefix for rate limit buckets */
    private static final String KEY_PREFIX = "rl:";

    /**
     * Constructor injection.
     *
     * StatefulRedisConnection<String, byte[]> is provided by RedisConfig.
     * We inject the connection directly rather than using RedisTemplate because
     * LettuceBasedProxyManager requires a StatefulRedisConnection typed to
     * <String, byte[]> — the String key encodes the userId, and the byte[] value
     * is Bucket4j's internal serialized bucket state. RedisTemplate<String, String>
     * (Spring's default auto-configured template) cannot hold byte[] values without
     * a custom serializer configured on it, making the explicit connection cleaner.
     */
    public AnalyzeRateLimiter(AppProperties appProperties,
                               SessionRepository sessionRepository,
                               StatefulRedisConnection<String, byte[]> rateLimitRedisConnection) {
        this.appProperties   = appProperties;
        this.sessionRepository = sessionRepository;
        this.proxyManager    = LettuceBasedProxyManager
                .builderFor(rateLimitRedisConnection)
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
        String key = KEY_PREFIX + userId.toString();
        int perMinute = appProperties.getRateLimit().getAnalyzeRequestsPerMinute();
        int perHour   = appProperties.getRateLimit().getAnalyzeRequestsPerHour();

        // BucketConfiguration is the bandwidth spec — built once per request but cheap.
        // proxyManager.builder().build() fetches the bucket state from Redis atomically.
        // If the key doesn't exist yet, it creates a new full bucket in the same CAS call.
        BucketConfiguration config = BucketConfiguration.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(perMinute)
                        .refillGreedy(perMinute, Duration.ofMinutes(1))
                        .build())
                .addLimit(Bandwidth.builder()
                        .capacity(perHour)
                        .refillGreedy(perHour, Duration.ofHours(1))
                        .build())
                .build();

        ConsumptionProbe probe = proxyManager
                .builder()
                .build(key, () -> config)
                .tryConsumeAndReturnRemaining(1);

        if (!probe.isConsumed()) {
            long retryAfterSeconds = probe.getNanosToWaitForRefill() / 1_000_000_000L;

            log.warn("Rate limit exceeded for user {}: retryAfter={}s remaining={}",
                    userId, retryAfterSeconds, probe.getRemainingTokens());

            throw new RateLimitExceededException(
                    String.format(
                            "Too many analysis requests. You can submit up to %d requests per minute " +
                            "and %d per hour. Please wait %d seconds before retrying.",
                            perMinute, perHour, retryAfterSeconds),
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
                    60L);
        }
    }
}