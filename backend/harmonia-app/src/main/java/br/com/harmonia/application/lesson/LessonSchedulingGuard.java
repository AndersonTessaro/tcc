package br.com.harmonia.application.lesson;

import br.com.harmonia.application.lesson.port.LessonRepository;
import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.lessoncore.LessonSlot;
import br.com.harmonia.lessoncore.SchedulingPolicy;
import br.com.harmonia.lessoncore.SessionStatus;
import br.com.harmonia.lessoncore.TimeRange;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * Adapter between persisted lessons and lesson-core's {@link SchedulingPolicy}: loads every slot that could
 * clash with a candidate (RN04 — lessons are individual) and delegates the decision to the domain policy.
 */
@Component
public class LessonSchedulingGuard {
    private final LessonRepository lessons;
    private final SchedulingPolicy policy = new SchedulingPolicy();

    public LessonSchedulingGuard(LessonRepository lessons) {
        this.lessons = lessons;
    }

    /** Throws {@code ScheduleConflictException} when the teacher or the student is already booked. */
    public void assertSlotIsFree(Enrollment enrollment, LocalDate date, LocalTime startTime,
                                 LocalTime endTime, SessionStatus status) {
        UUID teacherId = enrollment.getTeacher().getId();
        UUID studentId = enrollment.getStudent().getId();
        LessonSlot candidate = new LessonSlot(UUID.randomUUID(), teacherId, studentId, date,
            new TimeRange(startTime, endTime), status);
        policy.validateLessonSlot(candidate, slotsOn(teacherId, studentId, date));
    }

    private List<LessonSlot> slotsOn(UUID teacherId, UUID studentId, LocalDate date) {
        return Stream.concat(
                lessons.findByEnrollmentTeacherIdAndDate(teacherId, date).stream(),
                lessons.findByEnrollmentStudentIdAndDate(studentId, date).stream())
            .distinct()
            .map(LessonSchedulingGuard::toSlot)
            .toList();
    }

    private static LessonSlot toSlot(Lesson lesson) {
        return new LessonSlot(lesson.getId(), lesson.getEnrollment().getTeacher().getId(),
            lesson.getEnrollment().getStudent().getId(), lesson.getDate(),
            new TimeRange(lesson.getStartTime(), lesson.getEndTime()),
            LessonStatuses.toSessionStatus(lesson.getStatus()));
    }
}
