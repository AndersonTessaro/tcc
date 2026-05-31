package br.com.harmonia.presentation.auth;

import br.com.harmonia.application.security.AuthUseCase;
import br.com.harmonia.application.security.PasswordResetUseCase;
import br.com.harmonia.application.security.port.UsuarioRepository;
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
    private final UsuarioRepository usuarios;

    public AuthController(AuthUseCase auth, PasswordResetUseCase reset, UsuarioRepository usuarios) {
        this.auth = auth;
        this.reset = reset;
        this.usuarios = usuarios;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req.login(), req.senha());
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
        var usuario = usuarios.findByUsername(jwt.getSubject()).orElseThrow();
        Map<String, Object> body = new HashMap<>();
        body.put("username", usuario.getUsername());
        body.put("email", usuario.getEmail());
        body.put("displayName", usuario.getDisplayName());
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
        reset.reset(req.token(), req.novaSenha());
        return ResponseEntity.noContent().build();
    }
}
