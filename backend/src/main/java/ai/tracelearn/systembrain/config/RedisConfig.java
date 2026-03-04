package ai.tracelearn.systembrain.config;

import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.codec.RedisCodec;
import io.lettuce.core.codec.StringCodec;
import io.lettuce.core.codec.ByteArrayCodec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

import java.time.Duration;

/**
 * Redis configuration for Bucket4j distributed rate limiting.
 *
 * HIGH-5 FIX: Provides a StatefulRedisConnection<String, byte[]> that
 * AnalyzeRateLimiter injects into LettuceBasedProxyManager.
 *
 * Why a dedicated RedisClient instead of Spring's auto-configured one?
 *
 * Spring Boot auto-configures a Lettuce connection factory for RedisTemplate,
 * but RedisTemplate<String, String> (the default) uses String serialization for
 * both keys and values. Bucket4j requires byte[] for its internal binary bucket
 * state — using StringCodec for the value would corrupt the serialized data.
 *
 * The cleanest solution is a dedicated RedisClient + StatefulRedisConnection
 * using a mixed codec (StringCodec for keys, ByteArrayCodec for values).
 * This connection is used exclusively by AnalyzeRateLimiter and is independent
 * of any other Spring Data Redis usage elsewhere in the app.
 *
 * Spring Data Redis (spring-boot-starter-data-redis) is still on the classpath
 * for its auto-configuration and connection pooling — we just need this extra
 * typed connection for Bucket4j.
 */
@Configuration
public class RedisConfig {

    @Value("${spring.data.redis.host:localhost}")
    private String host;

    @Value("${spring.data.redis.port:6379}")
    private int port;

    @Value("${spring.data.redis.password:}")
    private String password;

    @Value("${spring.data.redis.timeout:2000ms}")
    private String timeout;

    /**
     * Dedicated Lettuce connection for Bucket4j's LettuceBasedProxyManager.
     *
     * Codec: String keys (userId prefix "rl:{uuid}") + byte[] values (bucket state).
     * This is the exact type signature LettuceBasedProxyManager.builderFor() requires.
     *
     * Connection lifecycle: this bean is a singleton — the connection is created
     * once at startup and reused for all rate limit checks. Lettuce connections
     * are thread-safe and multiplexed over a single TCP connection by default.
     */
    @Bean(destroyMethod = "close")
    public StatefulRedisConnection<String, byte[]> rateLimitRedisConnection() {
        RedisURI.Builder uriBuilder = RedisURI.builder()
                .withHost(host)
                .withPort(port)
                .withTimeout(Duration.ofMillis(parseDurationMs(timeout)));

        if (StringUtils.hasText(password)) {
            uriBuilder.withPassword(password.toCharArray());
        }

        RedisClient client = RedisClient.create(uriBuilder.build());

        // Mixed codec: String key (human-readable, debuggable in Redis CLI)
        //              byte[] value (Bucket4j's internal binary format)
        RedisCodec<String, byte[]> codec = RedisCodec.of(StringCodec.UTF8, ByteArrayCodec.INSTANCE);

        return client.connect(codec);
    }

    /**
     * Parses "2000ms" or "2000" → 2000L milliseconds.
     * Handles Spring's duration string format from application.yml.
     */
    private long parseDurationMs(String value) {
        if (value == null || value.isBlank()) return 2000L;
        String stripped = value.trim().toLowerCase();
        if (stripped.endsWith("ms")) {
            return Long.parseLong(stripped.replace("ms", "").trim());
        }
        return Long.parseLong(stripped);
    }
}