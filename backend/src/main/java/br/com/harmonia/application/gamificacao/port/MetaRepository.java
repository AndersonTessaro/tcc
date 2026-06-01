package br.com.harmonia.application.gamificacao.port;

import br.com.harmonia.infrastructure.persistence.gamificacao.Meta;
import br.com.harmonia.infrastructure.persistence.gamificacao.MetaStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MetaRepository extends JpaRepository<Meta, UUID> {
    List<Meta> findByAlunoIdAndStatus(UUID alunoId, MetaStatus status);
    List<Meta> findByAlunoId(UUID alunoId);
}
