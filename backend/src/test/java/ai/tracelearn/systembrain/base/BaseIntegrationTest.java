package ai.tracelearn.systembrain.base;

import ai.tracelearn.systembrain.domain.AuthProvider;
import ai.tracelearn.systembrain.domain.User;
import ai.tracelearn.systembrain.domain.UserRole;
import ai.tracelearn.systembrain.repository.UserRepository;
import ai.tracelearn.systembrain.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;

/**
 * Base class for all integration tests.
 *
 * What this provides:
 *   - A real PostgreSQL 15 container (shared across all subclasses via static field)
 *   - @ServiceConnection wires the container's JDBC URL/credentials into Spring
 *     datasource properties automatically — no @DynamicPropertySource needed
 *   - Flyway runs all migrations against this container on first startup
 *   - MockMvc for HTTP-layer testing without a running server
 *   - MockRedisConfiguration replaces Redis with stubs (no Redis container needed)
 *   - Helper methods for creating test users and JWT tokens
 *
 * Container reuse:
 *   @Container on a static field means the PostgreSQL container starts once per
 *   JVM (not once per test class). All test classes that extend this base share
 *   the same container, which keeps the test suite fast. Each test class is
 *   responsible for cleaning its own data in @BeforeEach.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
@Import(MockRedisConfiguration.class)
public abstract class BaseIntegrationTest {

    // Static = one container for the full JVM lifetime.
    // @ServiceConnection = Spring Boot auto-wires datasource.url/username/password.
    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:15-alpine")
                    .withDatabaseName("tracelearn_test")
                    .withUsername("test")
                    .withPassword("test");

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    @Autowired
    protected JwtTokenProvider jwtTokenProvider;

    /**
     * Wipe users before each test so tests are fully independent.
     * Sessions, attempts, analysis cascade-delete from user via @OnDelete.
     */
    @BeforeEach
    void cleanDatabase() {
        userRepository.deleteAll();
    }

    // ─── Test fixtures ────────────────────────────────────────────────────────

    /**
     * Creates and saves a real User entity in the test database.
     * Encodes the password with BCrypt (same encoder the production app uses).
     */
    protected User createTestUser(String email, String rawPassword) {
        User user = User.builder()
                .email(email.toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(rawPassword))
                .displayName("Test User")
                .authProvider(AuthProvider.LOCAL)
                .role(UserRole.USER)
                .emailVerified(true)
                .build();
        return userRepository.save(user);
    }

    /**
     * Creates a test user and returns a valid JWT access token for them.
     * Use this to populate Authorization: Bearer <token> headers in tests.
     */
    protected String createTestUserAndGetToken(String email, String rawPassword) {
        User user = createTestUser(email, rawPassword);
        return jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
    }

    /**
     * Short alias — creates user with predictable test credentials.
     */
    protected String defaultUserToken() {
        return createTestUserAndGetToken("test@tracelearn.ai", "Password123!");
    }
}