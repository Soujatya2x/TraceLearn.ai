package ai.tracelearn.systembrain.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Sign-up request DTO.
 *
 * Field name change: displayName → name
 *
 * The frontend's SignUpEmailRequest (types/auth.ts) sends:
 *   { name: string, email: string, password: string }
 *
 * The old backend field was 'displayName' which caused a silent validation
 * failure — the JSON field 'name' doesn't bind to 'displayName', so
 * @NotBlank on displayName always sees null and returns 400.
 *
 * AuthService.signUp() reads request.getName() and stores it as
 * User.displayName internally — the rename is purely at the DTO boundary.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignUpRequest {

    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 150, message = "Name must be between 2 and 150 characters")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Size(max = 255)
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 100, message = "Password must be between 8 and 100 characters")
    private String password;
}