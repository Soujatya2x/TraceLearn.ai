package ai.tracelearn.systembrain.controller;

import ai.tracelearn.systembrain.domain.User;
import ai.tracelearn.systembrain.dto.ApiResponse;
import ai.tracelearn.systembrain.dto.auth.AuthResponse;
import ai.tracelearn.systembrain.dto.auth.SignInRequest;
import ai.tracelearn.systembrain.dto.auth.SignUpRequest;
import ai.tracelearn.systembrain.exception.BadRequestException;
import ai.tracelearn.systembrain.exception.ResourceNotFoundException;
import ai.tracelearn.systembrain.repository.UserRepository;
import ai.tracelearn.systembrain.security.UserPrincipal;
import ai.tracelearn.systembrain.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Authentication controller.
 *
 * HIGH-3 FIX: Refresh token is now stored in an httpOnly cookie, NOT in the
 * response body. This prevents XSS attacks from stealing the refresh token.
 *
 * Cookie spec:
 *   Name:     tl_refresh
 *   Path:     /api/v1/auth   — only sent to auth endpoints, not every API call
 *   HttpOnly: true           — invisible to JavaScript
 *   Secure:   true           — HTTPS only (browsers ignore in localhost dev)
 *   SameSite: Lax            — sent on top-level navigations (needed for OAuth redirect)
 *   MaxAge:   7 days         — matches refreshExpirationMs in AppProperties
 *
 * Response bodies for signin/signup/refresh contain the access token only.
 * The refresh token field in TokensDto is omitted (null, excluded by @JsonInclude).
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    private static final String REFRESH_COOKIE_NAME = "tl_refresh";
    private static final int    REFRESH_COOKIE_MAX_AGE = 7 * 24 * 3600; // 7 days in seconds

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Sets the refresh token as an httpOnly cookie on the response.
     * Called after every successful auth event that issues a new refresh token.
     */
    private void setRefreshCookie(HttpServletResponse response, String refreshToken) {
        // Using Set-Cookie header directly gives us SameSite control.
        // The Servlet Cookie API (cookie.setSameSite) was only added in Servlet 6.0
        // and may not be available in all containers. The header approach works everywhere.
        response.addHeader("Set-Cookie", String.format(
            "%s=%s; Path=/api/v1/auth; HttpOnly; Secure; Max-Age=%d; SameSite=Lax",
            REFRESH_COOKIE_NAME,
            refreshToken,
            REFRESH_COOKIE_MAX_AGE
        ));
    }

    /**
     * Expires the refresh cookie — called on signout.
     * MaxAge=0 tells the browser to delete the cookie immediately.
     */
    private void expireRefreshCookie(HttpServletResponse response) {
        response.addHeader("Set-Cookie", String.format(
            "%s=; Path=/api/v1/auth; HttpOnly; Secure; Max-Age=0; SameSite=Lax",
            REFRESH_COOKIE_NAME
        ));
    }

    /**
     * Reads the refresh token from the httpOnly cookie in the request.
     * Returns null if the cookie is absent — caller is responsible for handling.
     */
    private String extractRefreshCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie cookie : cookies) {
            if (REFRESH_COOKIE_NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    /**
     * Builds a safe response body that contains the access token but NOT the
     * refresh token. The refresh token is sent via cookie, not in the body.
     */
    private AuthResponse buildSafeResponse(AuthResponse fullResponse) {
        return AuthResponse.builder()
                .user(fullResponse.getUser())
                .tokens(AuthResponse.TokensDto.builder()
                        .accessToken(fullResponse.getTokens().getAccessToken())
                        .tokenType(fullResponse.getTokens().getTokenType())
                        .expiresAt(fullResponse.getTokens().getExpiresAt())
                        // refreshToken intentionally omitted — it's in the httpOnly cookie
                        .build())
                .build();
    }

    // ─── Endpoints ───────────────────────────────────────────────────────────

    /**
     * POST /api/v1/auth/signup
     * Creates a new account. Sets refresh cookie + returns access token in body.
     */
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<AuthResponse>> signUp(
            @Valid @RequestBody SignUpRequest request,
            HttpServletResponse response) {

        log.info("Sign-up request received for email: {}", request.getEmail());
        AuthResponse auth = authService.signUp(request);
        setRefreshCookie(response, auth.getTokens().getRefreshToken());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(buildSafeResponse(auth), "User registered successfully"));
    }

    /**
     * POST /api/v1/auth/signin
     * Authenticates with email/password. Sets refresh cookie + returns access token in body.
     */
    @PostMapping("/signin")
    public ResponseEntity<ApiResponse<AuthResponse>> signIn(
            @Valid @RequestBody SignInRequest request,
            HttpServletResponse response) {

        log.info("Sign-in request received for email: {}", request.getEmail());
        AuthResponse auth = authService.signIn(request);
        setRefreshCookie(response, auth.getTokens().getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success(buildSafeResponse(auth), "Sign-in successful"));
    }

    /**
     * POST /api/v1/auth/refresh
     * Reads the refresh token from the httpOnly cookie (NOT from request body).
     * Issues a new access token + rotates the refresh cookie.
     *
     * The browser sends the cookie automatically because Path=/api/v1/auth
     * matches this endpoint path.
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            HttpServletRequest request,
            HttpServletResponse response) {

        String refreshToken = extractRefreshCookie(request);
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new BadRequestException("No refresh token found. Please sign in again.");
        }

        AuthResponse auth = authService.refreshTokenFromValue(refreshToken);
        // Rotate: issue a new refresh cookie, invalidating the old token value
        setRefreshCookie(response, auth.getTokens().getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success(buildSafeResponse(auth), "Token refreshed successfully"));
    }

    /**
     * GET /api/v1/auth/me
     * Returns current user profile from JWT. No tokens in response.
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AuthResponse.UserDto>> getCurrentUser(
            @AuthenticationPrincipal UserPrincipal principal) {

        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User", "id", principal.getId().toString()));

        AuthResponse.UserDto dto = AuthResponse.UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .provider(user.getAuthProvider().name().toLowerCase())
                .emailVerified(user.isEmailVerified())
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
                .updatedAt(user.getUpdatedAt() != null ? user.getUpdatedAt().toString() : null)
                .build();

        return ResponseEntity.ok(ApiResponse.success(dto, "User authenticated"));
    }

    /**
     * POST /api/v1/auth/signout
     * Expires the refresh cookie and clears in-memory state on the frontend.
     */
    @PostMapping("/signout")
    public ResponseEntity<ApiResponse<Void>> signOut(HttpServletResponse response) {
        log.info("Sign-out request received");
        expireRefreshCookie(response);
        return ResponseEntity.ok(ApiResponse.success(null, "Signed out successfully"));
    }
}