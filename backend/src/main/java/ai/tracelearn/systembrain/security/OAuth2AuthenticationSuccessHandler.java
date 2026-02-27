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

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();

        String accessToken = tokenProvider.generateAccessToken(userPrincipal.getId(), userPrincipal.getEmail());
        String refreshToken = tokenProvider.generateRefreshToken(userPrincipal.getId());

        String frontendOrigin = appProperties.getCors().getAllowedOrigins().split(",")[0].trim();
        String targetUrl = UriComponentsBuilder.fromUriString(frontendOrigin + "/auth/callback")
                .queryParam("token", accessToken)
                .queryParam("refresh_token", refreshToken)
                .build()
                .toUriString();

        log.info("OAuth2 authentication success for user: {}", userPrincipal.getEmail());
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
