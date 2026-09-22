package br.com.harmonia.application.lesson.port;

import br.com.harmonia.infrastructure.persistence.lesson.Attendance;
import br.com.harmonia.infrastructure.persistence.lesson.AttendanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {
    Optional<Attendance> findByLessonId(UUID lessonId);
    List<Attendance> findByLessonIdIn(Collection<UUID> lessonIds);
    long countByLessonEnrollmentTeacherIdAndStatus(UUID teacherId, AttendanceStatus status);
    long countByLessonEnrollmentStudentIdAndStatus(UUID studentId, AttendanceStatus status);
}
