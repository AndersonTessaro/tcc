package br.com.harmonia.application.perfil.port;

import br.com.harmonia.infrastructure.persistence.perfil.Turma;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TurmaRepository extends JpaRepository<Turma, UUID> {
}
