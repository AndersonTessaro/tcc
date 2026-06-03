package br.com.harmonia.presentation.auth;

import br.com.harmonia.application.security.AuthUseCase;
import br.com.harmonia.application.security.PasswordResetUseCase;
import br.com.harmonia.application.security.port.UserRepository;
import br.com.harmonia.presentation.auth.dto.*;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthUseCase auth;
    private final PasswordResetUseCase reset;
    private final UserRepository users;

    public AuthController(AuthUseCase auth, PasswordResetUseCase reset, UserRepository users) {
        this.auth = auth;
        this.reset = reset;
        this.users = users;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req.login(), req.password());
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest req) {
        return auth.refresh(req.refreshToken());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody RefreshRequest req) {
        auth.logout(req.refreshToken());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public Map<String, Object> me(@AuthenticationPrincipal Jwt jwt) {
        var user = users.findByUsername(jwt.getSubject()).orElseThrow();
        Map<String, Object> body = new HashMap<>();
        body.put("username", user.getUsername());
        body.put("email", user.getEmail());
        body.put("displayName", user.getDisplayName());
        body.put("authorities", jwt.getClaimAsStringList("authorities"));
        return body;
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgot(@Valid @RequestBody ForgotPasswordRequest req) {
        reset.forgot(req.email());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> reset(@Valid @RequestBody ResetPasswordRequest req) {
        reset.reset(req.token(), req.newPassword());
        return ResponseEntity.noContent().build();
    }
}
