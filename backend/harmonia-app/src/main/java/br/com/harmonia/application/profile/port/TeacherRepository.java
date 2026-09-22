package br.com.harmonia.application.profile.port;

import br.com.harmonia.infrastructure.persistence.profile.Teacher;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TeacherRepository extends JpaRepository<Teacher, UUID> {
    Optional<Teacher> findByUserId(UUID userId);

    @EntityGraph(attributePaths = {"instruments", "user"})
    List<Teacher> findByActiveTrue();

    @EntityGraph(attributePaths = {"instruments", "user"})
    Optional<Teacher> findWithInstrumentsById(UUID id);
}
