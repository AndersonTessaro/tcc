package br.com.harmonia.application.gamificacao.port;

import br.com.harmonia.infrastructure.persistence.gamificacao.Pratica;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface PraticaRepository extends JpaRepository<Pratica, UUID> {
    List<Pratica> findByAlunoIdAndDataBetween(UUID alunoId, LocalDate ini, LocalDate fim);
}
