package ai.tracelearn.systembrain.security;

import ai.tracelearn.systembrain.domain.AuthProvider;
import ai.tracelearn.systembrain.domain.User;
import ai.tracelearn.systembrain.domain.UserRole;
import ai.tracelearn.systembrain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        return processOAuth2User(userRequest, oAuth2User);
    }

    private OAuth2User processOAuth2User(OAuth2UserRequest request, OAuth2User oAuth2User) {
        String registrationId = request.getClientRegistration().getRegistrationId();
        AuthProvider provider = AuthProvider.valueOf(registrationId.toUpperCase());
        Map<String, Object> attributes = oAuth2User.getAttributes();

        String email = extractEmail(attributes, provider);
        String name = extractName(attributes, provider);
        String avatarUrl = extractAvatar(attributes, provider);
        String providerId = extractProviderId(attributes, provider);

        Optional<User> existingUser = userRepository.findByEmail(email);

        User user;
        if (existingUser.isPresent()) {
            user = existingUser.get();
            user.setDisplayName(name);
            user.setAvatarUrl(avatarUrl);
            user = userRepository.save(user);
        } else {
            user = User.builder()
                    .email(email)
                    .displayName(name)
                    .avatarUrl(avatarUrl)
                    .authProvider(provider)
                    .providerId(providerId)
                    .role(UserRole.USER)
                    .emailVerified(true)
                    .build();
            user = userRepository.save(user);
        }

        return UserPrincipal.create(user, attributes);
    }

    private String extractEmail(Map<String, Object> attrs, AuthProvider provider) {
        return switch (provider) {
            case GOOGLE -> (String) attrs.get("email");
            case GITHUB -> {
                String email = (String) attrs.get("email");
                yield email != null ? email : attrs.get("id") + "@github.tracelearn.ai";
            }
            default -> (String) attrs.get("email");
        };
    }

    private String extractName(Map<String, Object> attrs, AuthProvider provider) {
        return switch (provider) {
            case GOOGLE -> (String) attrs.get("name");
            case GITHUB -> {
                String name = (String) attrs.get("name");
                yield name != null ? name : (String) attrs.get("login");
            }
            default -> (String) attrs.get("name");
        };
    }

    private String extractAvatar(Map<String, Object> attrs, AuthProvider provider) {
        return switch (provider) {
            case GOOGLE -> (String) attrs.get("picture");
            case GITHUB -> (String) attrs.get("avatar_url");
            default -> null;
        };
    }

    private String extractProviderId(Map<String, Object> attrs, AuthProvider provider) {
        return switch (provider) {
            case GOOGLE -> (String) attrs.get("sub");
            case GITHUB -> String.valueOf(attrs.get("id"));
            default -> null;
        };
    }
}
