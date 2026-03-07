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

        // HIGH-3 FIX: Set refresh token as httpOnly cookie BEFORE the redirect.
        // The browser will persist this cookie and send it on future requests
        // to /api/v1/auth/* (the cookie Path).
        //
        // The old code put refresh_token in the redirect URL query param, which:
        //   - Stored it in browser history
        //   - Exposed it in server access logs via Referer header
        //   - Could be read by any JS on the page before router.replace() ran
        //
        // Using Set-Cookie header directly gives us SameSite=Lax control.
        // SameSite=Lax is required (not Strict) because the redirect FROM
        // Google/GitHub back to our backend is a cross-site top-level navigation
        // — SameSite=Strict would block the cookie from being set on that redirect.
        response.addHeader("Set-Cookie", String.format(
            "%s=%s; Path=/; HttpOnly; Secure; Max-Age=%d; SameSite=Lax",
            REFRESH_COOKIE_NAME,
            refreshToken,
            REFRESH_COOKIE_MAX_AGE
        ));

        String frontendOrigin = appProperties.getCors().getAllowedOrigins().split(",")[0].trim();

        // MEDIUM-1 FIX: Access token in URL fragment (#) instead of query param (?).
        //
        // Fragment vs query param for token passing:
        //   Query param (?token=...): sent in the HTTP Referer header on the NEXT
        //     navigation — any analytics tool, CDN, or server that receives that
        //     next request can see the token in its access logs.
        //   Fragment (#token=...): NEVER sent to the server. The browser strips the
        //     fragment from the Referer header entirely. It also never appears in
        //     server access logs for the callback page itself.
        //
        // The access token still appears briefly in window.location — router.replace()
        // in callback/page.tsx clears it from history within 800ms of page load.
        // The fragment approach reduces the exposure window to essentially zero:
        // there is no server that ever receives it, and no Referer leak on redirect.
        //
        // Note: UriComponentsBuilder.fragment() does NOT URL-encode the value by
        // default when using .build() (not .encode()). JWT characters (A-Z, a-z,
        // 0-9, -, _, .) are all safe in fragments without encoding, so this is fine.
        String targetUrl = UriComponentsBuilder.fromUriString(frontendOrigin + "/auth/callback")
                .fragment("token=" + accessToken)
                .build()
                .toUriString();

        log.info("OAuth2 authentication success for user: {}", userPrincipal.getEmail());
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}