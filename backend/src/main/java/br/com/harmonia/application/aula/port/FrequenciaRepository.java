package br.com.harmonia.application.aula.port;

import br.com.harmonia.infrastructure.persistence.aula.Frequencia;
import br.com.harmonia.infrastructure.persistence.aula.FrequenciaStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface FrequenciaRepository extends JpaRepository<Frequencia, UUID> {
    Optional<Frequencia> findByAulaId(UUID aulaId);
    long countByAulaMatriculaProfessorIdAndStatus(UUID professorId, FrequenciaStatus status);
}
