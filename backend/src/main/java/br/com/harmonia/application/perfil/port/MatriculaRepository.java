package br.com.harmonia.application.perfil.port;

import br.com.harmonia.infrastructure.persistence.perfil.Matricula;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MatriculaRepository extends JpaRepository<Matricula, UUID> {
    List<Matricula> findByProfessorId(UUID professorId);
    List<Matricula> findByAlunoId(UUID alunoId);
    List<Matricula> findByProfessorIdAndAlunoId(UUID professorId, UUID alunoId);
}
