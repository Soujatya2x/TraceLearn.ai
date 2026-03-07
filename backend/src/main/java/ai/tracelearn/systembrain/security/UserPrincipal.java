package ai.tracelearn.systembrain.security;

import ai.tracelearn.systembrain.domain.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.*;

/**
 * Central principal used across JWT, OAuth2, and OIDC authentication flows.
 *
 * Implements OidcUser (which extends OAuth2User) so it can be returned from
 * both CustomOAuth2UserService (GitHub) and CustomOidcUserService (Google).
 * OAuth2AuthenticationSuccessHandler casts authentication.getPrincipal() to
 * UserPrincipal — this works for both flows because both services return this class.
 */
@Getter
public class UserPrincipal implements UserDetails, OidcUser {

    private final UUID id;
    private final String email;
    private final String password;
    private final String displayName;
    private final Collection<? extends GrantedAuthority> authorities;
    private Map<String, Object> attributes;

    // OIDC-specific — null for GitHub OAuth2 flows, populated for Google OIDC
    private final OidcIdToken idToken;
    private final OidcUserInfo userInfo;

    private UserPrincipal(UUID id, String email, String password, String displayName,
                          Collection<? extends GrantedAuthority> authorities,
                          Map<String, Object> attributes,
                          OidcIdToken idToken, OidcUserInfo userInfo) {
        this.id = id;
        this.email = email;
        this.password = password;
        this.displayName = displayName;
        this.authorities = authorities;
        this.attributes = attributes;
        this.idToken = idToken;
        this.userInfo = userInfo;
    }

    /**
     * Factory for JWT / password auth — no OAuth2 attributes.
     */
    public static UserPrincipal create(User user) {
        List<GrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
        return new UserPrincipal(
                user.getId(), user.getEmail(), user.getPasswordHash(),
                user.getDisplayName(), authorities, new HashMap<>(),
                null, null);
    }

    /**
     * Factory for OAuth2 flows (GitHub).
     */
    public static UserPrincipal create(User user, Map<String, Object> attributes) {
        List<GrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
        return new UserPrincipal(
                user.getId(), user.getEmail(), user.getPasswordHash(),
                user.getDisplayName(), authorities, new HashMap<>(attributes),
                null, null);
    }

    /**
     * Factory for OIDC flows (Google).
     * Preserves OidcIdToken and OidcUserInfo from the OIDC exchange.
     */
    public static UserPrincipal createOidc(User user, OidcUser oidcUser) {
        List<GrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
        return new UserPrincipal(
                user.getId(), user.getEmail(), user.getPasswordHash(),
                user.getDisplayName(), authorities, new HashMap<>(oidcUser.getAttributes()),
                oidcUser.getIdToken(), oidcUser.getUserInfo());
    }

    // ── OidcUser ──────────────────────────────────────────────────────────────

    @Override
    public Map<String, Object> getClaims() {
        return idToken != null ? idToken.getClaims() : attributes;
    }

    @Override
    public OidcUserInfo getUserInfo() {
        return userInfo;
    }

    @Override
    public OidcIdToken getIdToken() {
        return idToken;
    }

    // ── OAuth2User ────────────────────────────────────────────────────────────

    @Override
    public Map<String, Object> getAttributes() {
        return attributes;
    }

    @Override
    public String getName() {
        return String.valueOf(id);
    }

    // ── UserDetails ───────────────────────────────────────────────────────────

    @Override
    public String getUsername()               { return email; }

    @Override
    public boolean isAccountNonExpired()      { return true; }

    @Override
    public boolean isAccountNonLocked()       { return true; }

    @Override
    public boolean isCredentialsNonExpired()  { return true; }

    @Override
    public boolean isEnabled()                { return true; }
}