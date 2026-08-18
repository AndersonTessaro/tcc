package br.com.harmonia.application.profile.port;

import br.com.harmonia.infrastructure.persistence.profile.Teacher;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TeacherRepository extends JpaRepository<Teacher, UUID> {
    Optional<Teacher> findByUserId(UUID userId);
}
