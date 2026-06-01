package br.com.harmonia.application.gamificacao.port;

import br.com.harmonia.infrastructure.persistence.gamificacao.Progresso;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ProgressoRepository extends JpaRepository<Progresso, UUID> {
    Optional<Progresso> findByAlunoId(UUID alunoId);
}
