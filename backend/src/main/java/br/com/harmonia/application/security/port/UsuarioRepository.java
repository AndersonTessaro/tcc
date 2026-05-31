package br.com.harmonia.application.security.port;

import br.com.harmonia.infrastructure.persistence.security.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {
    Optional<Usuario> findByUsername(String username);
    Optional<Usuario> findByEmail(String email);
    Optional<Usuario> findByUsernameOrEmail(String username, String email);
}
