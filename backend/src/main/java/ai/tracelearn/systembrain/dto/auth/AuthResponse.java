package ai.tracelearn.systembrain.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Auth response DTO — nested structure matching the frontend's AuthResponse type.
 *
 * Frontend shape (types/auth.ts):
 *   interface AuthResponse {
 *     user:   { id, email, name, avatarUrl, provider, emailVerified, createdAt, updatedAt }
 *     tokens: { accessToken, refreshToken, expiresAt }
 *   }
 *
 * The old flat structure (userId, email, accessToken, ... all at top level) did NOT match
 * this — authService.ts crashed on auth.tokens.accessToken being undefined.
 *
 * Rules for the nested types:
 *   UserDto.name      — maps to User.displayName (frontend uses 'name', domain uses 'displayName')
 *   UserDto.provider  — lowercase string: "local", "google", "github"
 *                       Frontend maps "local" → AuthProvider 'email' in getCurrentUser()
 *   TokensDto.expiresAt — Unix timestamp in ms (not seconds).
 *                         Frontend stores this and checks Date.now() >= expiresAt - 60_000
 *
 * Used by: AuthController (signup, signin, refresh, me endpoints)
 *          OAuth2AuthenticationSuccessHandler (token embedded in redirect URL)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private UserDto user;
    private TokensDto tokens;

    // ── Nested: user profile ──────────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserDto {
        /** UUID as string — matches frontend User.id: string */
        private UUID id;
        private String email;
        /** Mapped from User.displayName — frontend field is 'name' */
        private String name;
        private String avatarUrl;
        /**
         * Lowercase provider string: "local" | "google" | "github"
         * Frontend AuthProvider type is 'email' | 'google' | 'github'.
         * The frontend maps "local" → "email" in getCurrentUser().
         */
        private String provider;
        private boolean emailVerified;
        /** ISO-8601 string from Instant.toString() */
        private String createdAt;
        /** ISO-8601 string from Instant.toString() */
        private String updatedAt;
    }

    // ── Nested: tokens ────────────────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TokensDto {
        private String accessToken;
        private String refreshToken;
        private String tokenType;
        /**
         * Unix timestamp in MILLISECONDS — not seconds.
         * Frontend checks: Date.now() >= expiresAt - 60_000
         * Backend sets: System.currentTimeMillis() + jwt.expirationMs
         */
        private long expiresAt;
    }
}