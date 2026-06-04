package br.com.harmonia.application.gamification.port;

import br.com.harmonia.infrastructure.persistence.gamification.Goal;
import br.com.harmonia.infrastructure.persistence.gamification.GoalStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GoalRepository extends JpaRepository<Goal, UUID> {
    List<Goal> findByStudentIdAndStatus(UUID studentId, GoalStatus status);
    List<Goal> findByStudentId(UUID studentId);
    long countByStudentIdAndStatus(UUID studentId, GoalStatus status);
}
