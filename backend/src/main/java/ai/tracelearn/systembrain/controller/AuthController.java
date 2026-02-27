package ai.tracelearn.systembrain.controller;

import ai.tracelearn.systembrain.domain.User;
import ai.tracelearn.systembrain.dto.ApiResponse;
import ai.tracelearn.systembrain.dto.auth.AuthResponse;
import ai.tracelearn.systembrain.dto.auth.RefreshTokenRequest;
import ai.tracelearn.systembrain.dto.auth.SignInRequest;
import ai.tracelearn.systembrain.dto.auth.SignUpRequest;
import ai.tracelearn.systembrain.exception.ResourceNotFoundException;
import ai.tracelearn.systembrain.repository.UserRepository;
import ai.tracelearn.systembrain.security.UserPrincipal;
import ai.tracelearn.systembrain.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Authentication controller handling sign-up, sign-in, token refresh,
 * and current user retrieval.
 * OAuth2 flows (Google, GitHub) are handled by Spring Security OAuth2 client
 * and the custom OAuth2AuthenticationSuccessHandler.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    /**
     * POST /api/v1/auth/signup
     * Register a new user with email/password.
     */
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<AuthResponse>> signUp(@Valid @RequestBody SignUpRequest request) {
        log.info("Sign-up request received for email: {}", request.getEmail());
        AuthResponse response = authService.signUp(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(response, "User registered successfully"));
    }

    /**
     * POST /api/v1/auth/signin
     * Authenticate an existing user with email/password.
     */
    @PostMapping("/signin")
    public ResponseEntity<ApiResponse<AuthResponse>> signIn(@Valid @RequestBody SignInRequest request) {
        log.info("Sign-in request received for email: {}", request.getEmail());
        AuthResponse response = authService.signIn(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Sign-in successful"));
    }

    /**
     * POST /api/v1/auth/refresh
     * Refresh an expired access token using a valid refresh token.
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        AuthResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Token refreshed successfully"));
    }

    /**
     * GET /api/v1/auth/me
     * Get current authenticated user info from JWT token.
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AuthResponse>> getCurrentUser(
            @AuthenticationPrincipal UserPrincipal principal) {

        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", principal.getId().toString()));

        AuthResponse response = AuthResponse.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .build();

        return ResponseEntity.ok(ApiResponse.success(response, "User authenticated"));
    }
}
