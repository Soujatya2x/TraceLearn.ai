package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.config.AppProperties;
import ai.tracelearn.systembrain.domain.SessionStatus;
import ai.tracelearn.systembrain.exception.RateLimitExceededException;
import ai.tracelearn.systembrain.repository.SessionRepository;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.distributed.BucketProxy;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.distributed.proxy.RemoteBucketBuilder;
import io.lettuce.core.api.StatefulRedisConnection;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AnalyzeRateLimiter")
class AnalyzeRateLimiterTest {

    @Mock
    @SuppressWarnings("rawtypes")
    private StatefulRedisConnection redisConnection;

    @Mock
    private SessionRepository sessionRepository;

    @Mock
    @SuppressWarnings("unchecked")
    private ProxyManager<String> proxyManager;

    @Mock
    @SuppressWarnings("unchecked")
    private RemoteBucketBuilder<String> remoteBucketBuilder;

    @Mock
    private BucketProxy bucketProxy;

    private AppProperties appProperties;
    private AnalyzeRateLimiter rateLimiter;

    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() throws Exception {
        appProperties = buildProperties(2, 5, 2);

        rateLimiter = new AnalyzeRateLimiter(
                appProperties, sessionRepository,
                (StatefulRedisConnection<String, byte[]>) redisConnection);

        // Replace the internal proxyManager with our mock via reflection
        java.lang.reflect.Field pmField =
                AnalyzeRateLimiter.class.getDeclaredField("proxyManager");
        pmField.setAccessible(true);
        pmField.set(rateLimiter, proxyManager);

        when(proxyManager.builder()).thenReturn(remoteBucketBuilder);
        when(remoteBucketBuilder.build(anyString(), any(Supplier.class)))
                .thenReturn(bucketProxy);
    }

    // ─── Token bucket: allowed ────────────────────────────────────────────────

    @Nested
    @DisplayName("Token bucket — allowed")
    class Allowed {

        @Test
        @DisplayName("does not throw when tokens remain and no active sessions")
        void checkLimit_allowed() {
            stubBucketConsumed(4L);
            stubActiveSessions(0L);
            assertThatCode(() -> rateLimiter.checkLimit(userId)).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("does not throw when exactly 1 token remains")
        void checkLimit_lastToken() {
            stubBucketConsumed(1L);
            stubActiveSessions(0L);
            assertThatCode(() -> rateLimiter.checkLimit(userId)).doesNotThrowAnyException();
        }
    }

    // ─── Token bucket: denied ─────────────────────────────────────────────────

    @Nested
    @DisplayName("Token bucket — limit exceeded")
    class BucketExceeded {

        @Test
        @DisplayName("throws RateLimitExceededException when bucket is empty")
        void checkLimit_bucketEmpty() {
            stubBucketDenied(30_000_000_000L);

            assertThatThrownBy(() -> rateLimiter.checkLimit(userId))
                    .isInstanceOf(RateLimitExceededException.class)
                    .satisfies(ex -> {
                        long retryAfter = ((RateLimitExceededException) ex).getRetryAfterSeconds();
                        assertThat(retryAfter).isEqualTo(30L);
                    });

            verifyNoInteractions(sessionRepository);
        }

        @Test
        @DisplayName("exception message contains per-minute and per-hour limits")
        void checkLimit_messageContainsLimits() {
            stubBucketDenied(60_000_000_000L);

            assertThatThrownBy(() -> rateLimiter.checkLimit(userId))
                    .isInstanceOf(RateLimitExceededException.class)
                    .hasMessageContaining("2")   // perMinute
                    .hasMessageContaining("5");  // perHour
        }

        @Test
        @DisplayName("retryAfterSeconds is 0 when nanos-to-wait is 0")
        void checkLimit_retryAfterZero() {
            stubBucketDenied(0L);

            assertThatThrownBy(() -> rateLimiter.checkLimit(userId))
                    .isInstanceOf(RateLimitExceededException.class)
                    .satisfies(ex -> assertThat(
                            ((RateLimitExceededException) ex).getRetryAfterSeconds())
                            .isZero());
        }

        @Test
        @DisplayName("retryAfterSeconds rounds down for fractional seconds")
        void checkLimit_retryAfterRoundsDown() {
            stubBucketDenied(90_900_000_000L); // 90.9 seconds → 90

            assertThatThrownBy(() -> rateLimiter.checkLimit(userId))
                    .isInstanceOf(RateLimitExceededException.class)
                    .satisfies(ex -> assertThat(
                            ((RateLimitExceededException) ex).getRetryAfterSeconds())
                            .isEqualTo(90L));
        }
    }

    // ─── Concurrent session limit ─────────────────────────────────────────────

    @Nested
    @DisplayName("Concurrent session limit")
    class ConcurrentSessions {

        @Test
        @DisplayName("throws when active sessions equals maxConcurrent")
        void checkLimit_atLimit() {
            stubBucketConsumed(3L);
            stubActiveSessions(2L); // 2 == maxConcurrent
            assertThatThrownBy(() -> rateLimiter.checkLimit(userId))
                    .isInstanceOf(RateLimitExceededException.class);
        }

        @Test
        @DisplayName("throws when active sessions exceed maxConcurrent")
        void checkLimit_overLimit() {
            stubBucketConsumed(3L);
            stubActiveSessions(5L);
            assertThatThrownBy(() -> rateLimiter.checkLimit(userId))
                    .isInstanceOf(RateLimitExceededException.class);
        }

        @Test
        @DisplayName("does not throw when active sessions < maxConcurrent")
        void checkLimit_underLimit() {
            stubBucketConsumed(3L);
            stubActiveSessions(1L); // 1 < 2
            assertThatCode(() -> rateLimiter.checkLimit(userId)).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("DB query uses exactly CREATED, EXECUTING, ANALYZING statuses")
        void checkLimit_queriesCorrectStatuses() {
            stubBucketConsumed(3L);
            stubActiveSessions(0L);

            rateLimiter.checkLimit(userId);

            verify(sessionRepository).countByUserIdAndStatusIn(
                    eq(userId),
                    argThat(statuses ->
                            statuses.size() == 3
                            && statuses.containsAll(List.of(
                                    SessionStatus.CREATED,
                                    SessionStatus.EXECUTING,
                                    SessionStatus.ANALYZING))));
        }

        @Test
        @DisplayName("DB query is scoped to the requesting user only")
        void checkLimit_scopedToUser() {
            stubBucketConsumed(3L);
            stubActiveSessions(0L);

            rateLimiter.checkLimit(userId);

            verify(sessionRepository, never())
                    .countByUserIdAndStatusIn(eq(UUID.randomUUID()), any());
        }
    }

    // ─── Guard ordering ───────────────────────────────────────────────────────

    @Nested
    @DisplayName("Guard ordering")
    class GuardOrdering {

        @Test
        @DisplayName("bucket checked first — sessionRepository never called on bucket denial")
        void ordering_bucketBeforeConcurrent() {
            stubBucketDenied(30_000_000_000L);

            assertThatThrownBy(() -> rateLimiter.checkLimit(userId))
                    .isInstanceOf(RateLimitExceededException.class);

            verifyNoInteractions(sessionRepository);
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private void stubBucketConsumed(long remaining) {
        ConsumptionProbe probe = mock(ConsumptionProbe.class);
        when(probe.isConsumed()).thenReturn(true);
        when(probe.getRemainingTokens()).thenReturn(remaining);
        when(bucketProxy.tryConsumeAndReturnRemaining(1)).thenReturn(probe);
    }

    private void stubBucketDenied(long nanosToWaitForRefill) {
        ConsumptionProbe probe = mock(ConsumptionProbe.class);
        when(probe.isConsumed()).thenReturn(false);
        when(probe.getNanosToWaitForRefill()).thenReturn(nanosToWaitForRefill);
        when(probe.getRemainingTokens()).thenReturn(0L);
        when(bucketProxy.tryConsumeAndReturnRemaining(1)).thenReturn(probe);
    }

    private void stubActiveSessions(long count) {
        when(sessionRepository.countByUserIdAndStatusIn(eq(userId), anyList()))
                .thenReturn(count);
    }

    private AppProperties buildProperties(int perMinute, int perHour, int maxConcurrent) {
        AppProperties props = new AppProperties();
        props.getRateLimit().setAnalyzeRequestsPerMinute(perMinute);
        props.getRateLimit().setAnalyzeRequestsPerHour(perHour);
        props.getRateLimit().setMaxConcurrentSessions(maxConcurrent);
        props.getJwt().setSecret("dGVzdC1zZWNyZXQ=");
        props.getWorkspace().setRootPath("/tmp");
        props.getSandbox().setBaseUrl("http://localhost:9999");
        props.getAiAgent().setBaseUrl("http://localhost:9998");
        return props;
    }
}