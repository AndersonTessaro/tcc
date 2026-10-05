package br.com.harmonia.application.lesson.port;

import br.com.harmonia.infrastructure.persistence.lesson.MakeupLesson;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;
import java.util.Optional;

public interface MakeupLessonRepository extends JpaRepository<MakeupLesson, UUID> {
    boolean existsByOriginalLessonId(UUID originalLessonId);
    Optional<MakeupLesson> findByOriginalLessonId(UUID originalLessonId);
}
