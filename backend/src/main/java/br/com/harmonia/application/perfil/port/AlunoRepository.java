package br.com.harmonia.application.perfil.port;

import br.com.harmonia.infrastructure.persistence.perfil.Aluno;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AlunoRepository extends JpaRepository<Aluno, UUID> {
    Optional<Aluno> findByUsuarioId(UUID usuarioId);
}
