package ai.tracelearn.systembrain.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.util.SerializationUtils;

import java.util.Base64;

/**
 * Cookie-based OAuth2 authorization request repository.
 *
 * WHY THIS EXISTS:
 * Spring Security's default AuthorizationRequestRepository uses HttpSession
 * to store the OAuth2 state parameter between the authorization redirect and
 * the callback. This breaks when session management is STATELESS (which we
 * need for the JWT-based REST API).
 *
 * This implementation serializes the OAuth2AuthorizationRequest into a
 * short-lived httpOnly cookie instead, so the state param survives the
 * browser redirect round-trip without requiring a server-side session.
 *
 * FLOW:
 *   1. User clicks "Sign in with Google"
 *   2. Browser hits /oauth2/authorization/google
 *   3. Spring builds OAuth2AuthorizationRequest (includes random state param)
 *   4. THIS CLASS saves that request as a cookie on the response
 *   5. Spring redirects user to Google with the state param
 *   6. Google redirects back to /api/v1/auth/oauth2/callback/google?code=...&state=...
 *   7. Spring calls THIS CLASS to load the saved request from the cookie
 *   8. Spring validates state param matches — CSRF protection
 *   9. THIS CLASS removes the cookie
 *  10. OAuth2AuthenticationSuccessHandler runs and redirects to frontend
 */
@Slf4j
public class HttpCookieOAuth2AuthorizationRequestRepository
        implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

    public static final String OAUTH2_AUTHORIZATION_REQUEST_COOKIE_NAME = "oauth2_auth_request";
    private static final int COOKIE_EXPIRE_SECONDS = 180; // 3 minutes — more than enough for OAuth round-trip

    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
        return getCookieValue(request, OAUTH2_AUTHORIZATION_REQUEST_COOKIE_NAME)
                .map(this::deserialize)
                .orElse(null);
    }

    @Override
    public void saveAuthorizationRequest(OAuth2AuthorizationRequest authorizationRequest,
                                          HttpServletRequest request,
                                          HttpServletResponse response) {
        if (authorizationRequest == null) {
            // Spring calls this with null to remove the request after consumption
            deleteCookie(request, response, OAUTH2_AUTHORIZATION_REQUEST_COOKIE_NAME);
            return;
        }

        Cookie cookie = new Cookie(OAUTH2_AUTHORIZATION_REQUEST_COOKIE_NAME, serialize(authorizationRequest));
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        cookie.setMaxAge(COOKIE_EXPIRE_SECONDS);
        // SameSite=Lax allows the cookie to be sent on top-level cross-site redirects
        // (the OAuth callback redirect from Google/GitHub back to our backend).
        // SameSite=Strict would block this redirect and break the flow.
        // We set it via the header directly because the Servlet Cookie API
        // doesn't support SameSite until Servlet 6.0 on newer containers.
        response.addHeader("Set-Cookie",
            String.format("%s=%s; Path=/; HttpOnly; Max-Age=%d; SameSite=Lax",
                OAUTH2_AUTHORIZATION_REQUEST_COOKIE_NAME,
                serialize(authorizationRequest),
                COOKIE_EXPIRE_SECONDS));

        log.debug("Saved OAuth2 authorization request to cookie for state: {}",
                authorizationRequest.getState());
    }

    @Override
    public OAuth2AuthorizationRequest removeAuthorizationRequest(HttpServletRequest request,
                                                                  HttpServletResponse response) {
        OAuth2AuthorizationRequest authorizationRequest = loadAuthorizationRequest(request);
        if (authorizationRequest != null) {
            deleteCookie(request, response, OAUTH2_AUTHORIZATION_REQUEST_COOKIE_NAME);
            log.debug("Removed OAuth2 authorization request cookie for state: {}",
                    authorizationRequest.getState());
        }
        return authorizationRequest;
    }

    // ─── Private helpers ──────────────────────────────────────

    private String serialize(OAuth2AuthorizationRequest request) {
        return Base64.getUrlEncoder().encodeToString(SerializationUtils.serialize(request));
    }

    @SuppressWarnings("unchecked")
    private OAuth2AuthorizationRequest deserialize(String value) {
        try {
            return (OAuth2AuthorizationRequest) SerializationUtils.deserialize(
                    Base64.getUrlDecoder().decode(value));
        } catch (Exception e) {
            log.warn("Failed to deserialize OAuth2 authorization request from cookie", e);
            return null;
        }
    }

    private java.util.Optional<String> getCookieValue(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return java.util.Optional.empty();
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                return java.util.Optional.of(cookie.getValue());
            }
        }
        return java.util.Optional.empty();
    }

    private void deleteCookie(HttpServletRequest request, HttpServletResponse response, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return;
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                response.addHeader("Set-Cookie",
                    String.format("%s=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax", name));
                break;
            }
        }
    }
}