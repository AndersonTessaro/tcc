package br.com.harmonia.application.lesson.port;

import br.com.harmonia.infrastructure.persistence.lesson.LessonAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LessonAttachmentRepository extends JpaRepository<LessonAttachment, UUID> {
    List<LessonAttachment> findByLessonId(UUID lessonId);
}
