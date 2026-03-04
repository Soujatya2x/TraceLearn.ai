package ai.tracelearn.systembrain.base;

import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.lettuce.core.api.StatefulRedisConnection;
import org.mockito.Mockito;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;

/**
 * Replaces all Redis beans with Mockito stubs in the test Spring context.
 *
 * Why this is needed:
 *   The production context requires a real Redis connection for AnalyzeRateLimiter.
 *   In tests we want to control rate limiting behaviour (mock it) rather than
 *   spin up a Redis container. This configuration provides no-op stubs for all
 *   Redis-related beans so the context starts cleanly without Redis.
 *
 * Scope:
 *   This @TestConfiguration is imported explicitly by BaseIntegrationTest.
 *   It is NOT auto-detected — only activated in tests that extend the base class.
 *
 * AnalyzeRateLimiter itself is mocked at the test level via @MockBean in
 * AnalyzeControllerTest, so its dependency on ProxyManager never executes.
 */
@TestConfiguration
public class MockRedisConfiguration {

    /**
     * Stub RedisConnectionFactory so Spring Data Redis auto-configuration
     * doesn't try to open a TCP connection to localhost:6379.
     */
    @Bean
    @Primary
    public RedisConnectionFactory redisConnectionFactory() {
        return Mockito.mock(RedisConnectionFactory.class);
    }

    /**
     * Stub RedisTemplate — satisfies any autowiring point that needs one,
     * including Spring Session if it were on the classpath.
     */
    @Bean
    @Primary
    public RedisTemplate<String, Object> redisTemplate() {
        return Mockito.mock(RedisTemplate.class);
    }

    /**
     * Stub StatefulRedisConnection<String, byte[]> — this is the exact bean
     * type that RedisConfig produces and AnalyzeRateLimiter depends on.
     * The cast is unchecked but safe here: we never call methods on this mock
     * because AnalyzeRateLimiter is itself mocked in tests that need it.
     */
    @Bean
    @Primary
    @SuppressWarnings("unchecked")
    public StatefulRedisConnection<String, byte[]> rateLimitRedisConnection() {
        return Mockito.mock(StatefulRedisConnection.class);
    }

    /**
     * Stub ProxyManager<String> — consumed by AnalyzeRateLimiter constructor.
     * Never invoked in tests: AnalyzeRateLimiter is @MockBean'd at the test level.
     */
    @Bean
    @Primary
    @SuppressWarnings("unchecked")
    public ProxyManager<String> rateLimitProxyManager() {
        return Mockito.mock(ProxyManager.class);
    }
}