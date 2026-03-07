package ai.tracelearn.systembrain.security;

import ai.tracelearn.systembrain.domain.AuthProvider;
import ai.tracelearn.systembrain.domain.User;
import ai.tracelearn.systembrain.domain.UserRole;
import ai.tracelearn.systembrain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * OIDC user service for Google login.
 *
 * WHY THIS EXISTS:
 * Google uses OpenID Connect (OIDC), not plain OAuth2. Spring Security routes
 * OIDC providers through OidcUserService, not DefaultOAuth2UserService.
 * Without this bean, Spring creates a raw DefaultOidcUser which cannot be
 * cast to UserPrincipal — causing ClassCastException in the success handler.
 *
 * This service mirrors CustomOAuth2UserService but extends OidcUserService
 * and returns OidcUser (which UserPrincipal implements via OAuth2User).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOidcUserService extends OidcUserService {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        // Let Spring load the OIDC user and validate the ID token first
        OidcUser oidcUser = super.loadUser(userRequest);
        return processOidcUser(userRequest, oidcUser);
    }

    private OidcUser processOidcUser(OidcUserRequest request, OidcUser oidcUser) {
        String registrationId = request.getClientRegistration().getRegistrationId();
        AuthProvider provider = AuthProvider.valueOf(registrationId.toUpperCase());

        // For Google OIDC, email comes from the ID token claims directly
        String email = oidcUser.getEmail();
        if (email == null || email.isBlank()) {
            throw new OAuth2AuthenticationException(
                    "Google OIDC did not supply a valid email in the ID token.");
        }

        String name      = oidcUser.getFullName() != null ? oidcUser.getFullName() : oidcUser.getName();
        String avatarUrl = oidcUser.getPicture();
        String providerId = oidcUser.getSubject(); // Google's "sub" claim

        Optional<User> existingUser = userRepository.findByEmail(email);

        User user;
        if (existingUser.isPresent()) {
            user = existingUser.get();
            user.setDisplayName(name);
            user.setAvatarUrl(avatarUrl);
            user = userRepository.save(user);
            log.info("Existing user signed in via Google OIDC: {}", email);
        } else {
            user = User.builder()
                    .email(email)
                    .displayName(name)
                    .avatarUrl(avatarUrl)
                    .authProvider(provider)
                    .providerId(providerId)
                    .role(UserRole.USER)
                    .emailVerified(true) // Google verifies email — always true for OIDC
                    .build();
            user = userRepository.save(user);
            log.info("New user registered via Google OIDC: {}", email);
        }

        // Return UserPrincipal which implements both UserDetails and OidcUser
        // This is what OAuth2AuthenticationSuccessHandler casts to UserPrincipal
        return UserPrincipal.createOidc(user, oidcUser);
    }
}