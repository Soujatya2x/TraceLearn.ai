package ai.tracelearn.systembrain.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

/**
 * Returns HTTP 401 JSON instead of redirecting to /login.
 *
 * Without this, Spring Security's default behaviour on an unauthenticated
 * request is to redirect to /login (an HTML page). That redirect:
 *   1. Goes to tracelearn.hopto.org/login which has no CORS header → CORS error
 *   2. Returns HTML, not JSON → Axios can't parse it
 *
 * With this entry point registered in SecurityConfig, Spring returns:
 *   HTTP 401  { "error": "Unauthorized", "message": "..." }
 * which Axios's response interceptor catches and redirects to /auth/sign-in.
 */
@Component
public class AuthEntryPoint implements AuthenticationEntryPoint {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        MAPPER.writeValue(response.getOutputStream(), Map.of(
                "error",   "Unauthorized",
                "message", "Authentication required. Please sign in.",
                "path",    request.getRequestURI()
        ));
    }
}