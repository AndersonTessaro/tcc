package br.com.harmonia.application.aula.port;

import br.com.harmonia.infrastructure.persistence.aula.Aula;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface AulaRepository extends JpaRepository<Aula, UUID> {
    List<Aula> findByMatriculaAlunoIdOrderByDataDesc(UUID alunoId);
    List<Aula> findByMatriculaProfessorIdAndDataBetween(UUID professorId, LocalDate ini, LocalDate fim);
    List<Aula> findByMatriculaProfessorIdAndData(UUID professorId, LocalDate data);
}
