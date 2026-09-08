package br.com.harmonia.lessoncore;

import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SchedulingPolicyTest {
    private final SchedulingPolicy policy = new SchedulingPolicy();
    private final UUID teacher = UUID.randomUUID();
    private final UUID student = UUID.randomUUID();

    @Test
    void rejectsOverlappingLessonForTeacher() {
        LessonSlot existing = lesson(teacher, student, LocalTime.of(10, 0), LocalTime.of(11, 0));
        LessonSlot candidate = lesson(teacher, UUID.randomUUID(), LocalTime.of(10, 30), LocalTime.of(11, 30));

        assertThatThrownBy(() -> policy.validateLessonSlot(candidate, List.of(existing)))
            .isInstanceOf(ScheduleConflictException.class);
    }

    @Test
    void acceptsBackToBackLessons() {
        LessonSlot existing = lesson(teacher, student, LocalTime.of(10, 0), LocalTime.of(11, 0));
        LessonSlot candidate = lesson(teacher, UUID.randomUUID(), LocalTime.of(11, 0), LocalTime.of(12, 0));

        assertThatCode(() -> policy.validateLessonSlot(candidate, List.of(existing))).doesNotThrowAnyException();
    }

    @Test
    void ignoresCanceledLessonWhenCheckingConflict() {
        LessonSlot existing = new LessonSlot(UUID.randomUUID(), teacher, student, LocalDate.now(),
            new TimeRange(LocalTime.of(10, 0), LocalTime.of(11, 0)), SessionStatus.CANCELED);
        LessonSlot candidate = lesson(teacher, UUID.randomUUID(), LocalTime.of(10, 30), LocalTime.of(11, 30));

        assertThatCode(() -> policy.validateLessonSlot(candidate, List.of(existing))).doesNotThrowAnyException();
    }

    @Test
    void rejectsOverlappingWeeklyScheduleForStudent() {
        WeeklyScheduleSlot existing = weekly(teacher, student, LocalTime.of(10, 0), LocalTime.of(11, 0));
        WeeklyScheduleSlot candidate = weekly(UUID.randomUUID(), student, LocalTime.of(10, 30), LocalTime.of(11, 30));

        assertThatThrownBy(() -> policy.validateWeeklySlot(candidate, List.of(existing)))
            .isInstanceOf(ScheduleConflictException.class);
    }

    @Test
    void ignoresTheCandidateItselfWhenRevalidatingTheSameLesson() {
        UUID lessonId = UUID.randomUUID();
        LessonSlot existing = new LessonSlot(lessonId, teacher, student, LocalDate.now(),
            new TimeRange(LocalTime.of(10, 0), LocalTime.of(11, 0)), SessionStatus.SCHEDULED);
        LessonSlot candidate = new LessonSlot(lessonId, teacher, student, LocalDate.now(),
            new TimeRange(LocalTime.of(10, 0), LocalTime.of(11, 0)), SessionStatus.SCHEDULED);

        assertThatCode(() -> policy.validateLessonSlot(candidate, List.of(existing))).doesNotThrowAnyException();
    }

    @Test
    void allowsSameTimeRangeOnAnotherDate() {
        LessonSlot existing = lesson(teacher, student, LocalTime.of(10, 0), LocalTime.of(11, 0));
        LessonSlot candidate = new LessonSlot(UUID.randomUUID(), teacher, student, LocalDate.now().plusDays(1),
            new TimeRange(LocalTime.of(10, 0), LocalTime.of(11, 0)), SessionStatus.SCHEDULED);

        assertThatCode(() -> policy.validateLessonSlot(candidate, List.of(existing))).doesNotThrowAnyException();
    }

    @Test
    void allowsUnrelatedTeacherAndStudentAtTheSameTime() {
        LessonSlot existing = lesson(teacher, student, LocalTime.of(10, 0), LocalTime.of(11, 0));
        LessonSlot candidate = lesson(UUID.randomUUID(), UUID.randomUUID(), LocalTime.of(10, 0), LocalTime.of(11, 0));

        assertThatCode(() -> policy.validateLessonSlot(candidate, List.of(existing))).doesNotThrowAnyException();
    }

    @Test
    void allowsOverlappingWeeklySlotOnAnotherWeekday() {
        WeeklyScheduleSlot existing = weekly(teacher, student, LocalTime.of(10, 0), LocalTime.of(11, 0));
        WeeklyScheduleSlot candidate = new WeeklyScheduleSlot(UUID.randomUUID(), teacher, student,
            DayOfWeek.TUESDAY, new TimeRange(LocalTime.of(10, 0), LocalTime.of(11, 0)));

        assertThatCode(() -> policy.validateWeeklySlot(candidate, List.of(existing))).doesNotThrowAnyException();
    }

    private LessonSlot lesson(UUID teacherId, UUID studentId, LocalTime start, LocalTime end) {
        return new LessonSlot(UUID.randomUUID(), teacherId, studentId, LocalDate.now(),
            new TimeRange(start, end), SessionStatus.SCHEDULED);
    }

    private WeeklyScheduleSlot weekly(UUID teacherId, UUID studentId, LocalTime start, LocalTime end) {
        return new WeeklyScheduleSlot(UUID.randomUUID(), teacherId, studentId, DayOfWeek.MONDAY,
            new TimeRange(start, end));
    }
}
