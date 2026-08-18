package br.com.harmonia.application.gamification.port;

import br.com.harmonia.infrastructure.persistence.gamification.Progress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ProgressRepository extends JpaRepository<Progress, UUID> {
    Optional<Progress> findByStudentId(UUID studentId);
}
