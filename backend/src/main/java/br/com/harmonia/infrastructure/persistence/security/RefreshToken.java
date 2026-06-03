package br.com.harmonia.infrastructure.persistence.security;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "auth_refresh_token")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class RefreshToken {
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

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    public boolean isRevoked() { return revokedAt != null; }
    public boolean isExpired() { return expiresAt.isBefore(LocalDateTime.now()); }
    public boolean isActive() { return !isRevoked() && !isExpired(); }
}
