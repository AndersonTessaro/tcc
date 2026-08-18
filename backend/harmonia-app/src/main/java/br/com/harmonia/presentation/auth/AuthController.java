package br.com.harmonia.presentation.auth;

import br.com.harmonia.application.security.AuthUseCase;
import br.com.harmonia.application.security.PasswordResetUseCase;
import br.com.harmonia.application.security.port.UserRepository;
import br.com.harmonia.infrastructure.security.TokenService.BadRefreshTokenException;
import br.com.harmonia.presentation.auth.dto.*;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private static final String REFRESH_COOKIE = "refresh_token";

    private final AuthUseCase auth;
    private final PasswordResetUseCase reset;
    private final UserRepository users;
    private final boolean cookieSecure;
    private final long refreshTtlDays;

    public AuthController(AuthUseCase auth, PasswordResetUseCase reset, UserRepository users,
                          @Value("${app.cookie.secure:false}") boolean cookieSecure,
                          @Value("${app.jwt.refresh-ttl-days}") long refreshTtlDays) {
        this.auth = auth;
        this.reset = reset;
        this.users = users;
        this.cookieSecure = cookieSecure;
        this.refreshTtlDays = refreshTtlDays;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthBody> login(@Valid @RequestBody LoginRequest req) {
        AuthResponse result = auth.login(req.login(), req.password());
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshCookie(result.refreshToken()).toString())
            .body(AuthBody.from(result));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthBody> refresh(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        if (refreshToken == null) throw new BadRefreshTokenException("Missing refresh token");
        AuthResponse result = auth.refresh(refreshToken);
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshCookie(result.refreshToken()).toString())
            .body(AuthBody.from(result));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        if (refreshToken != null) auth.logout(refreshToken);
        return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
            .build();
    }

    private ResponseCookie refreshCookie(String value) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite("Lax")
            .path("/auth")
            .maxAge(Duration.ofDays(refreshTtlDays))
            .build();
    }

    private ResponseCookie clearRefreshCookie() {
        return ResponseCookie.from(REFRESH_COOKIE, "")
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite("Lax")
            .path("/auth")
            .maxAge(0)
            .build();
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
