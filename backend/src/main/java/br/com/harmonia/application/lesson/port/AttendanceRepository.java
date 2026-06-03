package br.com.harmonia.application.lesson.port;

import br.com.harmonia.infrastructure.persistence.lesson.Attendance;
import br.com.harmonia.infrastructure.persistence.lesson.AttendanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {
    Optional<Attendance> findByLessonId(UUID lessonId);
    long countByLessonEnrollmentTeacherIdAndStatus(UUID teacherId, AttendanceStatus status);
}
