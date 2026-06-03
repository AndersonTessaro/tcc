package br.com.harmonia.application.lesson;

import br.com.harmonia.application.lesson.port.LessonRepository;
import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.domain.common.OwnershipException;
import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import br.com.harmonia.infrastructure.persistence.lesson.LessonStatus;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Service
public class TeacherLessonUseCase {
    private final LessonRepository lessons;
    private final EnrollmentRepository enrollments;
    private final CurrentUserService current;

    public TeacherLessonUseCase(LessonRepository lessons, EnrollmentRepository enrollments, CurrentUserService current) {
        this.lessons = lessons;
        this.enrollments = enrollments;
        this.current = current;
    }

    private Enrollment teacherEnrollment(UUID enrollmentId, UUID teacherId) {
        Enrollment e = enrollments.findById(enrollmentId).orElseThrow();
        if (!e.getTeacher().getId().equals(teacherId))
            throw new OwnershipException("Enrollment belongs to another teacher");
        return e;
    }

    @Transactional
    public Lesson register(UUID enrollmentId, LocalDate date, LocalTime start, LocalTime end,
                           String content, String homework) {
        var teacher = current.currentTeacher();
        Lesson l = new Lesson();
        l.setEnrollment(teacherEnrollment(enrollmentId, teacher.getId()));
        l.setDate(date);
        l.setStartTime(start);
        l.setEndTime(end);
        l.setContent(content);
        l.setHomework(homework);
        l.setStatus(LessonStatus.DONE);
        return lessons.save(l);
    }

    public List<Lesson> history(LocalDate start, LocalDate end) {
        return lessons.findByEnrollmentTeacherIdAndDateBetween(current.currentTeacher().getId(), start, end);
    }

    public List<Lesson> scheduleForDay(LocalDate date) {
        return lessons.findByEnrollmentTeacherIdAndDate(current.currentTeacher().getId(), date);
    }
}
