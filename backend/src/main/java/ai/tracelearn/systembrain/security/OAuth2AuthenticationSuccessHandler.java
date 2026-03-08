package ai.tracelearn.systembrain.security;

import ai.tracelearn.systembrain.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtTokenProvider tokenProvider;
    private final AppProperties appProperties;

    private static final String REFRESH_COOKIE_NAME    = "tl_refresh";
    private static final int    REFRESH_COOKIE_MAX_AGE = 7 * 24 * 3600;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();

        String accessToken  = tokenProvider.generateAccessToken(userPrincipal.getId(), userPrincipal.getEmail());
        String refreshToken = tokenProvider.generateRefreshToken(userPrincipal.getId());

        // Set refresh token as httpOnly cookie before redirect.
        response.addHeader("Set-Cookie", String.format(
            "%s=%s; Path=/; HttpOnly; Secure; Max-Age=%d; SameSite=Lax",
            REFRESH_COOKIE_NAME,
            refreshToken,
            REFRESH_COOKIE_MAX_AGE
        ));

        // FIXED: Read FRONTEND_URL directly instead of splitting CORS_ORIGINS.
        // The old code used CORS_ORIGINS.split(',')[0] which breaks silently
        // if origins are reordered (e.g. localhost moved before the Vercel URL).
        // FRONTEND_URL is always the single canonical production frontend URL.
        String frontendOrigin = System.getenv("FRONTEND_URL") != null
            ? System.getenv("FRONTEND_URL").trim()
            : appProperties.getCors().getAllowedOrigins().split(",")[0].trim();

        // Access token passed in URL fragment (#) — never sent to server in Referer header.
        String targetUrl = UriComponentsBuilder.fromUriString(frontendOrigin + "/auth/callback")
                .fragment("token=" + accessToken)
                .build()
                .toUriString();

        log.info("OAuth2 authentication success for user: {}", userPrincipal.getEmail());
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}