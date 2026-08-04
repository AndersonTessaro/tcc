package br.com.harmonia.application.security;

import br.com.harmonia.application.security.port.PasswordResetTokenRepository;
import br.com.harmonia.application.security.port.UserRepository;
import br.com.harmonia.domain.security.RefreshTokenHasher;
import br.com.harmonia.infrastructure.email.EmailSenderPort;
import br.com.harmonia.infrastructure.persistence.security.PasswordResetToken;
import br.com.harmonia.infrastructure.security.TokenService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class PasswordResetUseCase {
    private final UserRepository users;
    private final PasswordResetTokenRepository tokens;
    private final EmailSenderPort email;
    private final PasswordEncoder encoder;
    private final TokenService tokenService;
    private final RefreshTokenHasher hasher = new RefreshTokenHasher();

    public PasswordResetUseCase(UserRepository users, PasswordResetTokenRepository tokens,
                                EmailSenderPort email, PasswordEncoder encoder, TokenService tokenService) {
        this.users = users;
        this.tokens = tokens;
        this.email = email;
        this.encoder = encoder;
        this.tokenService = tokenService;
    }

    @Transactional
    public void forgot(String emailAddr) {
        users.findByEmail(emailAddr).ifPresent(user -> {
            String raw = hasher.newOpaqueToken();
            PasswordResetToken prt = new PasswordResetToken();
            prt.setTokenHash(hasher.sha256Hex(raw));
            prt.setUser(user);
            prt.setExpiresAt(LocalDateTime.now().plusMinutes(30));
            tokens.save(prt);
            // Texto de e-mail exibido ao usuário — mantido em português.
            email.send(user.getEmail(), "Recuperação de senha",
                "Use este token para redefinir sua senha: " + raw);
        });
        // always 204 — does not reveal whether the email exists
    }

    @Transactional
    public void reset(String rawToken, String newPassword) {
        PasswordResetToken prt = tokens.findByTokenHash(hasher.sha256Hex(rawToken))
            .orElseThrow(() -> new InvalidResetTokenException("Invalid token"));
        if (prt.isUsed() || prt.getExpiresAt().isBefore(LocalDateTime.now()))
            throw new InvalidResetTokenException("Token expired or already used");
        var user = prt.getUser();
        user.setPassword(encoder.encode(newPassword));
        users.save(user);
        prt.setUsed(true);
        tokens.save(prt);
        tokenService.revokeAllForUser(user.getId());
    }

    public static class InvalidResetTokenException extends RuntimeException {
        public InvalidResetTokenException(String m) { super(m); }
    }
}
