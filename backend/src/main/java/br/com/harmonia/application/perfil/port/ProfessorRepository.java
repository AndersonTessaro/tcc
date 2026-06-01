package br.com.harmonia.application.perfil.port;

import br.com.harmonia.infrastructure.persistence.perfil.Professor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ProfessorRepository extends JpaRepository<Professor, UUID> {
    Optional<Professor> findByUsuarioId(UUID usuarioId);
}
