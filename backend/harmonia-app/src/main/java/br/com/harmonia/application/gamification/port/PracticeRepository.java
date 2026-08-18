package br.com.harmonia.application.gamification.port;

import br.com.harmonia.infrastructure.persistence.gamification.Practice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface PracticeRepository extends JpaRepository<Practice, UUID> {
    List<Practice> findByStudentIdAndDateBetween(UUID studentId, LocalDate start, LocalDate end);
}
