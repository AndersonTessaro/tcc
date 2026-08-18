package br.com.harmonia.application.profile.port;

import br.com.harmonia.infrastructure.persistence.profile.Student;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface StudentRepository extends JpaRepository<Student, UUID> {
    Optional<Student> findByUserId(UUID userId);
}
