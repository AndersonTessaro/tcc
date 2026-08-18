package br.com.harmonia.infrastructure.persistence.security;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "auth_password_reset_token")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class PasswordResetToken {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private boolean used = false;
}
