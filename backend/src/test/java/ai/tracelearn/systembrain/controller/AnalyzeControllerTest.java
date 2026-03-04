package ai.tracelearn.systembrain.controller;

import ai.tracelearn.systembrain.base.BaseIntegrationTest;
import ai.tracelearn.systembrain.domain.ExecutionMode;
import ai.tracelearn.systembrain.domain.User;
import ai.tracelearn.systembrain.dto.SessionDetailResponse;
import ai.tracelearn.systembrain.service.AnalyzeRateLimiter;
import ai.tracelearn.systembrain.service.OrchestrationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for POST /api/v1/analyze.
 *
 * OrchestrationService is @MockBean'd — we test the controller layer in isolation:
 *   - Authentication enforcement
 *   - Request validation (language allowlist, file size, required fields)
 *   - Rate limiter invocation
 *   - Correct routing signal reaching OrchestrationService
 *
 * We do NOT test the full async pipeline here (that is AsyncPipelineExecutor's concern).
 * We verify that the controller builds the right AnalyzeRequest and delegates it correctly.
 */
@DisplayName("AnalyzeController")
class AnalyzeControllerTest extends BaseIntegrationTest {

    private static final String ANALYZE_URL = "/api/v1/analyze";

    @MockBean
    private OrchestrationService orchestrationService;

    @MockBean
    private AnalyzeRateLimiter rateLimiter;

    // ─── Authentication ───────────────────────────────────────────────────────

    @Nested
    @DisplayName("Authentication")
    class Auth {

        @Test
        @DisplayName("returns 401 when no JWT token provided")
        void analyze_unauthenticated() throws Exception {
            MockMultipartFile code = codeFile("print('hello')", "main.py");

            mockMvc.perform(multipart(ANALYZE_URL)
                            .file(code)
                            .param("language", "python"))
                    .andExpect(status().isUnauthorized());

            verifyNoInteractions(orchestrationService);
        }
    }

    // ─── Multipart endpoint ───────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /analyze (multipart)")
    class MultipartAnalyze {

        @Test
        @DisplayName("routes to LIVE_EXECUTION when no frameworkType provided")
        void analyze_liveExecution_noFramework() throws Exception {
            String token = defaultUserToken();
            stubOrchestration();

            MockMultipartFile code = codeFile("print('hello')", "main.py");

            mockMvc.perform(multipart(ANALYZE_URL)
                            .file(code)
                            .param("language", "python")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true));

            // Verify OrchestrationService received the request — frameworkType is null
            ArgumentCaptor<ai.tracelearn.systembrain.dto.AnalyzeRequest> captor =
                    ArgumentCaptor.forClass(ai.tracelearn.systembrain.dto.AnalyzeRequest.class);
            verify(orchestrationService).analyzeCode(any(User.class), captor.capture());
            assertThat(captor.getValue().getFrameworkType()).isNull();
            assertThat(captor.getValue().getLanguage()).isEqualTo("python");
        }

        @Test
        @DisplayName("routes to LOG_ANALYSIS when frameworkType=springboot provided")
        void analyze_logAnalysis_withFramework() throws Exception {
            String token = defaultUserToken();
            stubOrchestration();

            MockMultipartFile code = codeFile("@SpringBootApplication class App {}", "App.java");
            MockMultipartFile logs = logFile("org.springframework.BeanCreationException");

            mockMvc.perform(multipart(ANALYZE_URL)
                            .file(code)
                            .file(logs)
                            .param("language", "java")
                            .param("frameworkType", "springboot")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isCreated());

            ArgumentCaptor<ai.tracelearn.systembrain.dto.AnalyzeRequest> captor =
                    ArgumentCaptor.forClass(ai.tracelearn.systembrain.dto.AnalyzeRequest.class);
            verify(orchestrationService).analyzeCode(any(User.class), captor.capture());
            assertThat(captor.getValue().getFrameworkType()).isEqualTo("springboot");
            assertThat(captor.getValue().getLanguage()).isEqualTo("java");
        }

        @Test
        @DisplayName("returns 400 for unsupported language")
        void analyze_unsupportedLanguage() throws Exception {
            String token = defaultUserToken();
            MockMultipartFile code = codeFile("print('hi')", "main.py");

            mockMvc.perform(multipart(ANALYZE_URL)
                            .file(code)
                            .param("language", "cobol")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Unsupported language")));

            verifyNoInteractions(orchestrationService);
        }

        @Test
        @DisplayName("returns 400 for unsupported frameworkType")
        void analyze_unsupportedFramework() throws Exception {
            String token = defaultUserToken();
            MockMultipartFile code = codeFile("code", "main.py");

            mockMvc.perform(multipart(ANALYZE_URL)
                            .file(code)
                            .param("language", "python")
                            .param("frameworkType", "rails")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(orchestrationService);
        }

        @Test
        @DisplayName("frameworkType is normalized to lowercase")
        void analyze_frameworkType_normalized() throws Exception {
            String token = defaultUserToken();
            stubOrchestration();
            MockMultipartFile code = codeFile("code", "main.py");

            mockMvc.perform(multipart(ANALYZE_URL)
                            .file(code)
                            .param("language", "python")
                            .param("frameworkType", "FastAPI")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isCreated());

            ArgumentCaptor<ai.tracelearn.systembrain.dto.AnalyzeRequest> captor =
                    ArgumentCaptor.forClass(ai.tracelearn.systembrain.dto.AnalyzeRequest.class);
            verify(orchestrationService).analyzeCode(any(), captor.capture());
            assertThat(captor.getValue().getFrameworkType()).isEqualTo("fastapi");
        }

        @Test
        @DisplayName("invokes rate limiter on every valid request")
        void analyze_rateLimiterInvoked() throws Exception {
            String token = defaultUserToken();
            stubOrchestration();
            MockMultipartFile code = codeFile("print('hi')", "main.py");

            mockMvc.perform(multipart(ANALYZE_URL)
                            .file(code)
                            .param("language", "python")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isCreated());

            verify(rateLimiter, times(1)).checkLimit(any(UUID.class));
        }

        @Test
        @DisplayName("returns 429 when rate limiter throws RateLimitExceededException")
        void analyze_rateLimitExceeded() throws Exception {
            String token = defaultUserToken();
            doThrow(new ai.tracelearn.systembrain.exception.RateLimitExceededException(
                    "Too many requests", 60L))
                    .when(rateLimiter).checkLimit(any(UUID.class));

            MockMultipartFile code = codeFile("print('hi')", "main.py");

            mockMvc.perform(multipart(ANALYZE_URL)
                            .file(code)
                            .param("language", "python")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isTooManyRequests())
                    .andExpect(header().exists("Retry-After"));

            verifyNoInteractions(orchestrationService);
        }
    }

    // ─── JSON endpoint ────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /analyze (JSON)")
    class JsonAnalyze {

        @Test
        @DisplayName("accepts JSON body and routes correctly")
        void analyze_json_success() throws Exception {
            String token = defaultUserToken();
            stubOrchestration();

            String body = """
                    {
                      "code": "def main(): pass",
                      "language": "python",
                      "filename": "main.py"
                    }
                    """;

            mockMvc.perform(post(ANALYZE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body)
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isCreated());
        }

        @Test
        @DisplayName("returns 400 when code is blank")
        void analyze_json_blankCode() throws Exception {
            String token = defaultUserToken();

            String body = """
                    {"code": "  ", "language": "python"}
                    """;

            mockMvc.perform(post(ANALYZE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body)
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("returns 400 when language is missing")
        void analyze_json_missingLanguage() throws Exception {
            String token = defaultUserToken();

            String body = """
                    {"code": "print('hi')"}
                    """;

            mockMvc.perform(post(ANALYZE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body)
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isBadRequest());
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private void stubOrchestration() {
        SessionDetailResponse stub = SessionDetailResponse.builder()
                .sessionId(UUID.randomUUID())          // UUID field, not String
                .status(ai.tracelearn.systembrain.domain.SessionStatus.CREATED)
                .language("python")
                .build();
        when(orchestrationService.analyzeCode(any(), any())).thenReturn(stub);
    }

    private MockMultipartFile codeFile(String content, String filename) {
        return new MockMultipartFile("code", filename, "text/plain", content.getBytes());
    }

    private MockMultipartFile logFile(String content) {
        return new MockMultipartFile("logs", "app.log", "text/plain", content.getBytes());
    }
}