package ai.tracelearn.systembrain.controller;

import ai.tracelearn.systembrain.base.BaseIntegrationTest;
import ai.tracelearn.systembrain.domain.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for POST /api/v1/auth/* endpoints.
 *
 * Coverage:
 *   - Sign-up: success, duplicate email, validation failures
 *   - Sign-in: success, wrong password, unknown email
 *   - Refresh: valid cookie, missing cookie
 *   - /me: authenticated, unauthenticated
 *   - Sign-out: cookie expiry header
 *
 * Uses real BCrypt + real JWT + real PostgreSQL (Testcontainers).
 * No mocks — tests the full Spring Security filter chain.
 */
@DisplayName("AuthController")
class AuthControllerTest extends BaseIntegrationTest {

    private static final String SIGNUP_URL  = "/api/v1/auth/signup";
    private static final String SIGNIN_URL  = "/api/v1/auth/signin";
    private static final String REFRESH_URL = "/api/v1/auth/refresh";
    private static final String ME_URL      = "/api/v1/auth/me";
    private static final String SIGNOUT_URL = "/api/v1/auth/signout";

    // ─── Sign-up ──────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /signup")
    class SignUp {

        @Test
        @DisplayName("returns 201, access token in body, refresh token in httpOnly cookie")
        void signUp_success() throws Exception {
            String body = """
                    {"name":"Alice","email":"alice@example.com","password":"Password123!"}
                    """;

            MvcResult result = mockMvc.perform(post(SIGNUP_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.tokens.accessToken").isNotEmpty())
                    // Refresh token must NOT appear in body (HIGH-3 fix)
                    .andExpect(jsonPath("$.data.tokens.refreshToken").doesNotExist())
                    .andExpect(jsonPath("$.data.user.email").value("alice@example.com"))
                    .andExpect(jsonPath("$.data.user.emailVerified").value(true))
                    .andReturn();

            // Refresh token must be in httpOnly cookie
            String setCookie = result.getResponse().getHeader("Set-Cookie");
            assertThat(setCookie).contains("tl_refresh=");
            assertThat(setCookie).contains("HttpOnly");
            assertThat(setCookie).contains("Path=/api/v1/auth");
        }

        @Test
        @DisplayName("returns 400 when email already registered")
        void signUp_duplicateEmail() throws Exception {
            createTestUser("duplicate@example.com", "Password123!");

            String body = """
                    {"name":"Bob","email":"duplicate@example.com","password":"Password123!"}
                    """;

            mockMvc.perform(post(SIGNUP_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Email is already registered"));
        }

        @Test
        @DisplayName("returns 400 when name is blank")
        void signUp_missingName() throws Exception {
            String body = """
                    {"name":"","email":"valid@example.com","password":"Password123!"}
                    """;

            mockMvc.perform(post(SIGNUP_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("returns 400 when password is too short")
        void signUp_shortPassword() throws Exception {
            String body = """
                    {"name":"Alice","email":"alice2@example.com","password":"short"}
                    """;

            mockMvc.perform(post(SIGNUP_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("email is stored lowercased")
        void signUp_emailStoredLowercase() throws Exception {
            String body = """
                    {"name":"Alice","email":"Alice@Example.COM","password":"Password123!"}
                    """;

            mockMvc.perform(post(SIGNUP_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.user.email").value("alice@example.com"));
        }
    }

    // ─── Sign-in ──────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /signin")
    class SignIn {

        @Test
        @DisplayName("returns 200, access token in body, refresh cookie set")
        void signIn_success() throws Exception {
            createTestUser("signin@example.com", "Password123!");

            String body = """
                    {"email":"signin@example.com","password":"Password123!"}
                    """;

            MvcResult result = mockMvc.perform(post(SIGNIN_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.tokens.accessToken").isNotEmpty())
                    .andExpect(jsonPath("$.data.tokens.refreshToken").doesNotExist())
                    .andReturn();

            assertThat(result.getResponse().getHeader("Set-Cookie")).contains("tl_refresh=");
        }

        @Test
        @DisplayName("returns 401 on wrong password")
        void signIn_wrongPassword() throws Exception {
            createTestUser("wrong@example.com", "CorrectPassword1!");

            String body = """
                    {"email":"wrong@example.com","password":"WrongPassword!"}
                    """;

            mockMvc.perform(post(SIGNIN_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("returns 401 when email not registered")
        void signIn_unknownEmail() throws Exception {
            String body = """
                    {"email":"ghost@example.com","password":"Password123!"}
                    """;

            mockMvc.perform(post(SIGNIN_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isUnauthorized());
        }
    }

    // ─── Refresh ──────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /refresh")
    class Refresh {

        @Test
        @DisplayName("returns new access token when valid refresh cookie is present")
        void refresh_withValidCookie() throws Exception {
            User user = createTestUser("refresh@example.com", "Password123!");
            String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

            mockMvc.perform(post(REFRESH_URL)
                            .cookie(new jakarta.servlet.http.Cookie("tl_refresh", refreshToken)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.tokens.accessToken").isNotEmpty())
                    .andExpect(jsonPath("$.data.tokens.refreshToken").doesNotExist());
        }

        @Test
        @DisplayName("returns 400 when no refresh cookie is present")
        void refresh_noCookie() throws Exception {
            mockMvc.perform(post(REFRESH_URL))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("No refresh token found. Please sign in again."));
        }

        @Test
        @DisplayName("returns 400 when refresh cookie contains an invalid token")
        void refresh_invalidToken() throws Exception {
            mockMvc.perform(post(REFRESH_URL)
                            .cookie(new jakarta.servlet.http.Cookie("tl_refresh", "not.a.valid.jwt")))
                    .andExpect(status().isBadRequest());
        }
    }

    // ─── /me ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("GET /me")
    class Me {

        @Test
        @DisplayName("returns current user profile when JWT is valid")
        void me_authenticated() throws Exception {
            User user = createTestUser("me@example.com", "Password123!");
            String token = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());

            mockMvc.perform(get(ME_URL)
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.email").value("me@example.com"))
                    .andExpect(jsonPath("$.data.emailVerified").value(true));
        }

        @Test
        @DisplayName("returns 401 when no Authorization header")
        void me_unauthenticated() throws Exception {
            mockMvc.perform(get(ME_URL))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("returns 401 when JWT is malformed")
        void me_malformedToken() throws Exception {
            mockMvc.perform(get(ME_URL)
                            .header("Authorization", "Bearer this.is.garbage"))
                    .andExpect(status().isUnauthorized());
        }
    }

    // ─── Sign-out ─────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /signout")
    class SignOut {

        @Test
        @DisplayName("returns 200 and expires the refresh cookie (MaxAge=0)")
        void signOut_expiresCookie() throws Exception {
            MvcResult result = mockMvc.perform(post(SIGNOUT_URL))
                    .andExpect(status().isOk())
                    .andReturn();

            String setCookie = result.getResponse().getHeader("Set-Cookie");
            assertThat(setCookie).contains("tl_refresh=");
            assertThat(setCookie).contains("Max-Age=0");
        }
    }
}