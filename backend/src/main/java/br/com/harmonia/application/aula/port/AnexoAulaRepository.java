package br.com.harmonia.application.aula.port;

import br.com.harmonia.infrastructure.persistence.aula.AnexoAula;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AnexoAulaRepository extends JpaRepository<AnexoAula, UUID> {
    List<AnexoAula> findByAulaId(UUID aulaId);
}
