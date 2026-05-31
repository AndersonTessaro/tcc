package br.com.harmonia.application.security;

import br.com.harmonia.application.security.port.UsuarioRepository;
import br.com.harmonia.infrastructure.persistence.security.RefreshToken;
import br.com.harmonia.infrastructure.persistence.security.Usuario;
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
    private final UsuarioRepository usuarios;

    public AuthUseCase(AuthenticationManager authManager, TokenService tokens, UsuarioRepository usuarios) {
        this.authManager = authManager;
        this.tokens = tokens;
        this.usuarios = usuarios;
    }

    @Transactional
    public AuthResponse login(String login, String senha) {
        var auth = authManager.authenticate(new UsernamePasswordAuthenticationToken(login, senha));
        UserDetails user = (UserDetails) auth.getPrincipal();
        Usuario usuario = usuarios.findByUsernameOrEmail(user.getUsername(), user.getUsername()).orElseThrow();
        return build(user, usuario, tokens.issueRefreshToken(usuario));
    }

    @Transactional
    public AuthResponse refresh(String rawRefresh) {
        RefreshToken rt = tokens.validateRefreshToken(rawRefresh);
        tokens.revoke(rt);
        Usuario usuario = rt.getUser();
        return build(usuario, usuario, tokens.issueRefreshToken(usuario));
    }

    @Transactional
    public void logout(String rawRefresh) {
        tokens.revoke(tokens.validateRefreshToken(rawRefresh));
    }

    private AuthResponse build(UserDetails user, Usuario usuario, String refresh) {
        List<String> auths = user.getAuthorities().stream().map(a -> a.getAuthority()).toList();
        return new AuthResponse(tokens.generateAccessToken(user), refresh, usuario.getUsername(), auths);
    }
}
