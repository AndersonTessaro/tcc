package br.com.harmonia.application.security;

import br.com.harmonia.application.security.port.UserRepository;
import br.com.harmonia.infrastructure.persistence.security.RefreshToken;
import br.com.harmonia.infrastructure.persistence.security.User;
import br.com.harmonia.infrastructure.security.TokenService;
import br.com.harmonia.presentation.auth.dto.AuthResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AuthUseCase {
    private final AuthenticationManager authManager;
    private final TokenService tokens;
    private final UserRepository users;

    public AuthUseCase(AuthenticationManager authManager, TokenService tokens, UserRepository users) {
        this.authManager = authManager;
        this.tokens = tokens;
        this.users = users;
    }

    @Transactional
    public AuthResponse login(String login, String password) {
        var auth = authManager.authenticate(new UsernamePasswordAuthenticationToken(login, password));
        UserDetails principal = (UserDetails) auth.getPrincipal();
        User user = users.findByUsernameOrEmail(principal.getUsername(), principal.getUsername()).orElseThrow();
        return build(principal, user, tokens.issueRefreshToken(user));
    }

    @Transactional
    public AuthResponse refresh(String rawRefresh) {
        RefreshToken rt = tokens.validateRefreshToken(rawRefresh);
        tokens.revoke(rt);
        User user = rt.getUser();
        return build(user, user, tokens.issueRefreshToken(user));
    }

    @Transactional
    public void logout(String rawRefresh) {
        tokens.revoke(tokens.validateRefreshToken(rawRefresh));
    }

    private AuthResponse build(UserDetails principal, User user, String refresh) {
        List<String> auths = principal.getAuthorities().stream().map(a -> a.getAuthority()).toList();
        return new AuthResponse(tokens.generateAccessToken(principal), refresh, user.getUsername(), auths);
    }
}
