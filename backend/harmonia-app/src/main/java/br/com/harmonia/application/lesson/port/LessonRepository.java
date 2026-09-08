package br.com.harmonia.application.lesson.port;

import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface LessonRepository extends JpaRepository<Lesson, UUID> {
    List<Lesson> findByEnrollmentStudentIdOrderByDateDesc(UUID studentId);
    List<Lesson> findByEnrollmentTeacherIdAndDateBetween(UUID teacherId, LocalDate start, LocalDate end);
    List<Lesson> findByEnrollmentTeacherIdAndDate(UUID teacherId, LocalDate date);
    List<Lesson> findByEnrollmentStudentIdAndDate(UUID studentId, LocalDate date);
    long countByEnrollmentStudentId(UUID studentId);
}
