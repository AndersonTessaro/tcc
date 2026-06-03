package br.com.harmonia.infrastructure.security;

import br.com.harmonia.application.security.port.RefreshTokenRepository;
import br.com.harmonia.domain.security.RefreshTokenHasher;
import br.com.harmonia.infrastructure.persistence.security.RefreshToken;
import br.com.harmonia.infrastructure.persistence.security.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class TokenService {
    private final JwtEncoder encoder;
    private final RefreshTokenRepository refreshTokens;
    private final RefreshTokenHasher hasher = new RefreshTokenHasher();
    private final long accessTtlMinutes;
    private final long refreshTtlDays;

    public TokenService(JwtEncoder encoder, RefreshTokenRepository refreshTokens,
                        @Value("${app.jwt.access-ttl-minutes}") long accessTtlMinutes,
                        @Value("${app.jwt.refresh-ttl-days}") long refreshTtlDays) {
        this.encoder = encoder;
        this.refreshTokens = refreshTokens;
        this.accessTtlMinutes = accessTtlMinutes;
        this.refreshTtlDays = refreshTtlDays;
    }

    public String generateAccessToken(UserDetails user) {
        Instant now = Instant.now();
        List<String> authorities = user.getAuthorities().stream()
            .map(a -> a.getAuthority()).toList();
        var claims = JwtClaimsSet.builder()
            .issuer("harmonia").issuedAt(now)
            .expiresAt(now.plus(Duration.ofMinutes(accessTtlMinutes)))
            .subject(user.getUsername())
            .claim("authorities", authorities)
            .build();
        return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }

    /** Creates refresh token, persists only the hash, returns the raw value. */
    public String issueRefreshToken(User user) {
        String raw = hasher.newOpaqueToken();
        RefreshToken rt = new RefreshToken();
        rt.setTokenHash(hasher.sha256Hex(raw));
        rt.setUser(user);
        rt.setExpiresAt(LocalDateTime.now().plusDays(refreshTtlDays));
        refreshTokens.save(rt);
        return raw;
    }

    public RefreshToken validateRefreshToken(String raw) {
        RefreshToken rt = refreshTokens.findByTokenHash(hasher.sha256Hex(raw))
            .orElseThrow(() -> new BadRefreshTokenException("Invalid refresh token"));
        if (!rt.isActive()) throw new BadRefreshTokenException("Refresh token expired or revoked");
        return rt;
    }

    public void revoke(RefreshToken rt) {
        rt.setRevokedAt(LocalDateTime.now());
        refreshTokens.save(rt);
    }

    public static class BadRefreshTokenException extends RuntimeException {
        public BadRefreshTokenException(String m) { super(m); }
    }
}
