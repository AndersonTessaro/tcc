package br.com.harmonia.infrastructure.security;

import br.com.harmonia.application.security.port.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AppUserDetailsService implements UserDetailsService {
    private final UserRepository users;

    public AppUserDetailsService(UserRepository users) {
        this.users = users;
    }

    @Override
    public UserDetails loadUserByUsername(String login) throws UsernameNotFoundException {
        return users.findByUsernameOrEmail(login, login)
            .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
