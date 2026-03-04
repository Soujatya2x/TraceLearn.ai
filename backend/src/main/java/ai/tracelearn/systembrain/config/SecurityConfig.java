package ai.tracelearn.systembrain.config;

import ai.tracelearn.systembrain.security.CustomOAuth2UserService;
import ai.tracelearn.systembrain.security.HttpCookieOAuth2AuthorizationRequestRepository;
import ai.tracelearn.systembrain.security.JwtAuthenticationFilter;
import ai.tracelearn.systembrain.security.OAuth2AuthenticationSuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.config.Customizer;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2AuthenticationSuccessHandler oAuth2SuccessHandler;
    private final CorsConfigurationSource corsConfigurationSource;

    /**
     * Cookie-based OAuth2 authorization request repository.
     *
     * REQUIRED because SessionCreationPolicy.STATELESS means there is no
     * HttpSession available. Spring's default AuthorizationRequestRepository
     * uses HttpSession to store the OAuth2 state parameter between the
     * authorization redirect and the callback — this silently fails with
     * STATELESS, causing "Authorization Request Not Found" errors on every
     * OAuth login attempt.
     *
     * This bean serializes the OAuth2AuthorizationRequest into a short-lived
     * httpOnly cookie instead, so state validation survives the redirect
     * round-trip without a server-side session.
     */
    @Bean
    public HttpCookieOAuth2AuthorizationRequestRepository cookieAuthorizationRequestRepository() {
        return new HttpCookieOAuth2AuthorizationRequestRepository();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // LOW-5 FIX: Security response headers.
            // Spring Security disables its default headers (including X-Content-Type-Options)
            // when using a custom SecurityFilterChain — they must be re-declared explicitly.
            //
            // X-Content-Type-Options: nosniff
            //   Prevents browsers from MIME-sniffing a response away from the declared
            //   Content-Type. Without this, a browser may execute a JSON response as a
            //   script if it's loaded via <script src="...">.
            //
            // X-Frame-Options: DENY
            //   Blocks all framing of the app — prevents clickjacking attacks where an
            //   attacker embeds the app in a transparent iframe and tricks users into
            //   clicking invisible elements.
            //
            // Referrer-Policy: strict-origin-when-cross-origin
            //   Sends full URL as Referer only for same-origin requests. For cross-origin
            //   requests it sends only the origin (no path). This prevents the Referer
            //   header from leaking session-scoped paths (e.g. /analyze?sessionId=...)
            //   to third-party analytics or CDNs loaded in the frontend.
            .headers(headers -> headers
                .contentTypeOptions(Customizer.withDefaults())
                .frameOptions(frame -> frame.deny())
                .referrerPolicy(referrer -> referrer
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(
                    // All email/password auth + token endpoints
                    "/api/v1/auth/**",
                    // Health + infra
                    "/api/v1/health/**",
                    "/actuator/health",
                    "/actuator/info",
                    // Framework detection — stateless, no auth needed
                    "/api/v1/detect",
                    // Spring Security's OAuth2 authorization entry point
                    // Browser navigates here to start the OAuth flow
                    "/oauth2/authorization/**",
                    // Spring Security's OAuth2 callback receiver
                    // Matches our custom redirect-uri in application.yml:
                    //   {baseUrl}/api/v1/auth/oauth2/callback/{registrationId}
                    "/api/v1/auth/oauth2/callback/**",
                    "/error"
                ).permitAll()
                // WebSocket HTTP upgrade handshake — authentication enforced
                // at the STOMP layer by WebSocketAuthChannelInterceptor
                .requestMatchers("/ws/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                // Use cookie-based state storage instead of session-based.
                // Without this, STATELESS session policy breaks the OAuth2
                // state validation and every login returns 401.
                .authorizationEndpoint(endpoint -> endpoint
                    .authorizationRequestRepository(cookieAuthorizationRequestRepository())
                )
                .redirectionEndpoint(endpoint -> endpoint
                    // Must match redirect-uri in application.yml:
                    //   {baseUrl}/api/v1/auth/oauth2/callback/{registrationId}
                    .baseUri("/api/v1/auth/oauth2/callback/*")
                )
                .userInfoEndpoint(userInfo ->
                    userInfo.userService(customOAuth2UserService))
                .successHandler(oAuth2SuccessHandler)
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig)
            throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}