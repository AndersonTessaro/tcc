package br.com.harmonia.infrastructure.security;

import br.com.harmonia.application.security.port.UsuarioRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AppUserDetailsService implements UserDetailsService {
    private final UsuarioRepository usuarios;

    public AppUserDetailsService(UsuarioRepository usuarios) {
        this.usuarios = usuarios;
    }

    @Override
    public UserDetails loadUserByUsername(String login) throws UsernameNotFoundException {
        return usuarios.findByUsernameOrEmail(login, login)
            .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado"));
    }
}
