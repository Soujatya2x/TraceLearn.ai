package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.config.AppProperties;
import ai.tracelearn.systembrain.domain.AuthProvider;
import ai.tracelearn.systembrain.domain.User;
import ai.tracelearn.systembrain.domain.UserRole;
import ai.tracelearn.systembrain.dto.auth.AuthResponse;
import ai.tracelearn.systembrain.dto.auth.SignInRequest;
import ai.tracelearn.systembrain.dto.auth.SignUpRequest;
import ai.tracelearn.systembrain.exception.BadRequestException;
import ai.tracelearn.systembrain.repository.UserRepository;
import ai.tracelearn.systembrain.security.JwtTokenProvider;
import ai.tracelearn.systembrain.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuthenticationManager authenticationManager;
    private final AppProperties appProperties;

    @Transactional
    public AuthResponse signUp(SignUpRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email is already registered");
        }

        User user = User.builder()
                .email(request.getEmail().toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .displayName(request.getName().trim())
                .authProvider(AuthProvider.LOCAL)
                .role(UserRole.USER)
                .emailVerified(true)   // MEDIUM-2: no email verification implemented yet — see V14 migration
                .build();

        user = userRepository.save(user);
        log.info("New user registered: {}", user.getEmail());
        return buildAuthResponse(user);
    }

    public AuthResponse signIn(SignInRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail().toLowerCase().trim(),
                        request.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();

        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new BadRequestException("User not found"));

        log.info("User signed in: {}", user.getEmail());
        return buildAuthResponse(user);
    }

    /**
     * Refresh from a token string — used by AuthController which reads
     * the refresh token from the httpOnly cookie (not the request body).
     *
     * HIGH-3 FIX: The old refreshToken(RefreshTokenRequest) method accepted the
     * token in the request body, which meant the frontend had to store it in
     * localStorage to send it back. This method takes the raw token string
     * that the controller extracted from the httpOnly cookie instead.
     */
    public AuthResponse refreshTokenFromValue(String refreshToken) {
        if (!tokenProvider.validateToken(refreshToken)) {
            throw new BadRequestException("Invalid or expired refresh token");
        }

        UUID userId = tokenProvider.getUserIdFromToken(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));

        log.info("Token refreshed for user: {}", user.getEmail());
        return buildAuthResponse(user);
    }

    /**
     * Builds the full AuthResponse including the refresh token.
     * The controller is responsible for extracting the refresh token and
     * setting it as an httpOnly cookie — it must NOT return it in the body.
     * See AuthController.buildSafeResponse().
     *
     * Called from: signUp, signIn, refreshTokenFromValue,
     *              OAuth2AuthenticationSuccessHandler
     */
    public AuthResponse buildAuthResponse(User user) {
        String accessToken  = tokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = tokenProvider.generateRefreshToken(user.getId());
        long   expiresAt    = System.currentTimeMillis() + appProperties.getJwt().getExpirationMs();

        return AuthResponse.builder()
                .user(AuthResponse.UserDto.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .name(user.getDisplayName())
                        .avatarUrl(user.getAvatarUrl())
                        .provider(user.getAuthProvider().name().toLowerCase())
                        .emailVerified(user.isEmailVerified())
                        .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
                        .updatedAt(user.getUpdatedAt() != null ? user.getUpdatedAt().toString() : null)
                        .build())
                .tokens(AuthResponse.TokensDto.builder()
                        .accessToken(accessToken)
                        .refreshToken(refreshToken)  // populated here, stripped by controller before response
                        .tokenType("Bearer")
                        .expiresAt(expiresAt)
                        .build())
                .build();
    }
}