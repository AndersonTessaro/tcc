package br.com.harmonia.application.security;

import br.com.harmonia.application.security.port.PasswordResetTokenRepository;
import br.com.harmonia.application.security.port.UsuarioRepository;
import br.com.harmonia.domain.security.RefreshTokenHasher;
import br.com.harmonia.infrastructure.email.EmailSenderPort;
import br.com.harmonia.infrastructure.persistence.security.PasswordResetToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class PasswordResetUseCase {
    private final UsuarioRepository usuarios;
    private final PasswordResetTokenRepository tokens;
    private final EmailSenderPort email;
    private final PasswordEncoder encoder;
    private final RefreshTokenHasher hasher = new RefreshTokenHasher();

    public PasswordResetUseCase(UsuarioRepository usuarios, PasswordResetTokenRepository tokens,
                                EmailSenderPort email, PasswordEncoder encoder) {
        this.usuarios = usuarios;
        this.tokens = tokens;
        this.email = email;
        this.encoder = encoder;
    }

    @Transactional
    public void forgot(String emailAddr) {
        usuarios.findByEmail(emailAddr).ifPresent(user -> {
            String raw = hasher.newOpaqueToken();
            PasswordResetToken prt = new PasswordResetToken();
            prt.setTokenHash(hasher.sha256Hex(raw));
            prt.setUser(user);
            prt.setExpiresAt(LocalDateTime.now().plusMinutes(30));
            tokens.save(prt);
            email.send(user.getEmail(), "Recuperação de senha",
                "Use este token para redefinir sua senha: " + raw);
        });
        // resposta sempre 204 — não revela se e-mail existe
    }

    @Transactional
    public void reset(String rawToken, String novaSenha) {
        PasswordResetToken prt = tokens.findByTokenHash(hasher.sha256Hex(rawToken))
            .orElseThrow(() -> new InvalidResetTokenException("Token inválido"));
        if (prt.isUsed() || prt.getExpiresAt().isBefore(LocalDateTime.now()))
            throw new InvalidResetTokenException("Token expirado ou já usado");
        var user = prt.getUser();
        user.setPassword(encoder.encode(novaSenha));
        usuarios.save(user);
        prt.setUsed(true);
        tokens.save(prt);
    }

    public static class InvalidResetTokenException extends RuntimeException {
        public InvalidResetTokenException(String m) { super(m); }
    }
}
