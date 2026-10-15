package br.com.harmonia.application.lesson.port;

import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface LessonRepository extends JpaRepository<Lesson, UUID> {
    List<Lesson> findByEnrollmentStudentIdOrderByDateDesc(UUID studentId);
    List<Lesson> findByEnrollmentTeacherIdAndDateBetween(UUID teacherId, LocalDate start, LocalDate end);
    List<Lesson> findByEnrollmentTeacherIdAndDate(UUID teacherId, LocalDate date);
    List<Lesson> findByEnrollmentStudentIdAndDate(UUID studentId, LocalDate date);
    List<Lesson> findByEnrollmentTeacherIdAndDateGreaterThanEqual(UUID teacherId, LocalDate from);
    List<Lesson> findByEnrollmentStudentIdAndDateGreaterThanEqual(UUID studentId, LocalDate from);
    long countByEnrollmentStudentId(UUID studentId);

    // RN09: a past lesson without attendance counts as due (and absent); today's only once recorded.
    @Query("""
        select new br.com.harmonia.application.lesson.port.EnrollmentAttendanceAggregate(
            e.id, count(l),
            sum(case when a.status = br.com.harmonia.infrastructure.persistence.lesson.AttendanceStatus.PRESENT then 1 else 0 end),
            sum(case when a.status = br.com.harmonia.infrastructure.persistence.lesson.AttendanceStatus.ABSENT then 1 else 0 end),
            sum(case when a.status = br.com.harmonia.infrastructure.persistence.lesson.AttendanceStatus.EXCUSED then 1 else 0 end),
            sum(case when a.id is null then 1 else 0 end))
        from Lesson l join l.enrollment e left join Attendance a on a.lesson = l
        where e.teacher.id = :teacherId
          and l.status <> br.com.harmonia.infrastructure.persistence.lesson.LessonStatus.CANCELED
          and l.date between :from and :to
          and (a.id is not null or l.date < :today)
        group by e.id""")
    List<EnrollmentAttendanceAggregate> attendanceByEnrollment(UUID teacherId, LocalDate from, LocalDate to, LocalDate today);
}
