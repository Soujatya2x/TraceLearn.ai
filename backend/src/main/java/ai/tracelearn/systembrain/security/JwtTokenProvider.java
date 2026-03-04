package ai.tracelearn.systembrain.security;

import ai.tracelearn.systembrain.config.AppProperties;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.UUID;

@Slf4j
@Component
public class JwtTokenProvider {

    private final SecretKey signingKey;
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;

    public JwtTokenProvider(AppProperties appProperties) {
        // JWT_SECRET must be a Base64-encoded string of at least 32 random bytes (256 bits).
        // Generate with: openssl rand -base64 32
        //
        // FIXED: The old constructor had a double-encoding bug:
        //   1. secret.getBytes()                — converts the Base64 string to its raw ASCII bytes
        //   2. Base64.getEncoder().encodeToString(...)  — re-encodes those bytes as Base64
        //   3. Decoders.BASE64.decode(...)       — decodes back, but now decoding the re-encoded form
        //
        // This roundabout path meant the signing key was derived from the ASCII bytes of the
        // Base64 string rather than the actual 32 random bytes the secret represents.
        // A 44-char Base64 string only has ~52 bits of entropy in its ASCII form —
        // far less than the 256 bits that openssl rand -base64 32 actually generated.
        //
        // FIX: Decode the Base64 secret string directly to get the raw 32-byte key.
        // This is what Keys.hmacShaKeyFor() expects — the actual key bytes, not ASCII chars.
        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(appProperties.getJwt().getSecret()));
        this.accessTokenExpirationMs  = appProperties.getJwt().getExpirationMs();
        this.refreshTokenExpirationMs = appProperties.getJwt().getRefreshExpirationMs();
    }

    public String generateAccessToken(Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        return generateAccessToken(userPrincipal.getId(), userPrincipal.getEmail());
    }

    public String generateAccessToken(UUID userId, String email) {
        Date now        = new Date();
        Date expiryDate = new Date(now.getTime() + accessTokenExpirationMs);

        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(signingKey)
                .compact();
    }

    public String generateRefreshToken(UUID userId) {
        Date now        = new Date();
        Date expiryDate = new Date(now.getTime() + refreshTokenExpirationMs);

        return Jwts.builder()
                .subject(userId.toString())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(signingKey)
                .compact();
    }

    public UUID getUserIdFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return UUID.fromString(claims.getSubject());
    }

    public boolean validateToken(String authToken) {
        try {
            Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(authToken);
            return true;
        } catch (SecurityException ex) {
            log.error("Invalid JWT signature: {}", ex.getMessage());
        } catch (MalformedJwtException ex) {
            log.error("Invalid JWT token: {}", ex.getMessage());
        } catch (ExpiredJwtException ex) {
            log.error("Expired JWT token: {}", ex.getMessage());
        } catch (UnsupportedJwtException ex) {
            log.error("Unsupported JWT token: {}", ex.getMessage());
        } catch (IllegalArgumentException ex) {
            log.error("JWT claims string is empty: {}", ex.getMessage());
        }
        return false;
    }
}