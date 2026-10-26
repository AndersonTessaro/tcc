package br.com.harmonia.application.lesson.port;

import br.com.harmonia.infrastructure.persistence.lesson.Attendance;
import br.com.harmonia.infrastructure.persistence.lesson.AttendanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {
    Optional<Attendance> findByLessonId(UUID lessonId);
    List<Attendance> findByLessonIdIn(Collection<UUID> lessonIds);

    @Query("""
        select new br.com.harmonia.application.lesson.port.LessonAttendanceStatus(a.lesson.id, a.status)
        from Attendance a where a.lesson.id in :lessonIds
        """)
    List<LessonAttendanceStatus> findStatusesByLessonIds(Collection<UUID> lessonIds);
    long countByLessonEnrollmentTeacherIdAndStatus(UUID teacherId, AttendanceStatus status);
    long countByLessonEnrollmentStudentIdAndStatus(UUID studentId, AttendanceStatus status);
    long countByLessonEnrollmentIdInAndStatus(Collection<UUID> enrollmentIds, AttendanceStatus status);
    List<Attendance> findTop100ByLessonEnrollmentStudentIdOrderByLessonDateDesc(UUID studentId);
    List<Attendance> findByLessonEnrollmentStudentIdAndStatusAndLessonDateBetween(UUID studentId, AttendanceStatus status,
                                                                                   LocalDate from, LocalDate to);
}
