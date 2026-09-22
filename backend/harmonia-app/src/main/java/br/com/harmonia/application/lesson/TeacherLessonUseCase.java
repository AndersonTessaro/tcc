package br.com.harmonia.application.lesson;

import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.application.lesson.port.LessonRepository;
import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.profile.EnrollmentRules;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import br.com.harmonia.infrastructure.persistence.lesson.LessonStatus;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.lessoncore.LessonLifecyclePolicy;
import br.com.harmonia.lessoncore.SessionStatus;
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
    private final LessonSchedulingGuard schedulingGuard;
    private final LessonLifecyclePolicy lifecyclePolicy = new LessonLifecyclePolicy();

    public TeacherLessonUseCase(LessonRepository lessons, EnrollmentRepository enrollments,
                                CurrentUserService current, LessonSchedulingGuard schedulingGuard) {
        this.lessons = lessons;
        this.enrollments = enrollments;
        this.current = current;
        this.schedulingGuard = schedulingGuard;
    }

    private Enrollment teacherEnrollment(UUID enrollmentId) {
        return current.assertOwnedByCurrentTeacher(enrollments.findById(enrollmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Enrollment")));
    }

    @Transactional
    public Lesson register(UUID enrollmentId, LocalDate date, LocalTime start, LocalTime end,
                           String content, String homework) {
        Enrollment enrollment = EnrollmentRules.requireActive(teacherEnrollment(enrollmentId));
        schedulingGuard.assertSlotIsFree(enrollment, date, start, end, SessionStatus.DONE);
        Lesson l = new Lesson();
        l.setEnrollment(enrollment);
        l.setDate(date);
        l.setStartTime(start);
        l.setEndTime(end);
        l.setContent(content);
        l.setHomework(homework);
        l.setStatus(LessonStatus.DONE);
        return lessons.save(l);
    }

    @Transactional
    public Lesson changeStatus(UUID lessonId, LessonStatus next) {
        Lesson lesson = lessons.findById(lessonId).orElseThrow(() -> new ResourceNotFoundException("Lesson"));
        current.assertOwnedByCurrentTeacher(lesson.getEnrollment());
        lifecyclePolicy.validateTransition(LessonStatuses.toSessionStatus(lesson.getStatus()),
            LessonStatuses.toSessionStatus(next));
        lesson.setStatus(next);
        return lessons.save(lesson);
    }

    public List<Lesson> history(LocalDate start, LocalDate end) {
        return lessons.findByEnrollmentTeacherIdAndDateBetween(current.currentTeacher().getId(), start, end);
    }

    public List<Lesson> scheduleForDay(LocalDate date) {
        return lessons.findByEnrollmentTeacherIdAndDate(current.currentTeacher().getId(), date);
    }
}
