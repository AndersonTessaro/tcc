package br.com.harmonia.application.lesson.port;

import br.com.harmonia.infrastructure.persistence.lesson.LessonAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LessonAttachmentRepository extends JpaRepository<LessonAttachment, UUID> {
    List<LessonAttachment> findByLessonEnrollmentStudentId(UUID studentId);
    List<LessonAttachment> findByLessonEnrollmentStudentIdAndLessonEnrollmentTeacherId(UUID studentId, UUID teacherId);
    List<LessonAttachment> findByLessonId(UUID lessonId);
    long countByLessonId(UUID lessonId);
    Optional<LessonAttachment> findByIdAndLessonId(UUID id, UUID lessonId);
}
