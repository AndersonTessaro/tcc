package br.com.harmonia.application.student;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.gamification.ProgressUseCase;
import br.com.harmonia.application.gamification.PracticeUseCase;
import br.com.harmonia.application.lesson.port.LessonRepository;
import br.com.harmonia.application.schedule.port.ScheduleRepository;
import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import br.com.harmonia.infrastructure.persistence.lesson.LessonStatus;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.infrastructure.persistence.profile.EnrollmentStatus;
import br.com.harmonia.infrastructure.persistence.profile.Student;
import br.com.harmonia.infrastructure.persistence.schedule.Schedule;
import br.com.harmonia.infrastructure.persistence.schedule.Weekday;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudentDashboardUseCaseTest {
    @Mock CurrentUserService current;
    @Mock ProgressUseCase progress;
    @Mock PracticeUseCase practice;
    @Mock LessonRepository lessons;
    @Mock ScheduleRepository schedules;
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-26T02:30:00Z"), ZoneId.of("America/Sao_Paulo"));
    private final LocalDate today = LocalDate.of(2026, 10, 25);
    private final UUID studentId = UUID.randomUUID();
    private final Enrollment enrollment = new Enrollment();
    private StudentDashboardUseCase useCase;

    @BeforeEach
    void setUp() {
        Student student = new Student();
        student.setId(studentId);
        when(current.currentStudent()).thenReturn(student);
        enrollment.setId(UUID.randomUUID());
        enrollment.setStartDate(today.minusMonths(1));
        useCase = new StudentDashboardUseCase(current, progress, practice, lessons, schedules, clock);
    }

    private Lesson lesson(LocalDate date, LocalTime start, LessonStatus status) {
        Lesson lesson = new Lesson();
        lesson.setId(UUID.randomUUID());
        lesson.setEnrollment(enrollment);
        lesson.setDate(date);
        lesson.setStartTime(start);
        lesson.setStatus(status);
        return lesson;
    }

    private void scheduled(Weekday weekday, LocalTime start) {
        Schedule schedule = new Schedule();
        schedule.setEnrollment(enrollment);
        schedule.setWeekday(weekday);
        schedule.setStartTime(start);
        schedule.setEndTime(start.plusMinutes(30));
        when(schedules.findByEnrollmentStudentIdAndActiveTrueAndEnrollmentStatus(studentId, EnrollmentStatus.ACTIVE))
            .thenReturn(List.of(schedule));
    }

    @Test
    void choosesEarliestFutureScheduledLesson() {
        Lesson first = lesson(today.plusDays(1), LocalTime.of(9, 0), LessonStatus.SCHEDULED);
        when(lessons.findByEnrollmentStudentIdAndDateGreaterThanEqual(studentId, today)).thenReturn(List.of(
            lesson(today.plusDays(2), LocalTime.of(8, 0), LessonStatus.SCHEDULED), first,
            lesson(today, LocalTime.of(23, 45), LessonStatus.CANCELED)));

        var result = useCase.get().nextLesson();

        assertThat(result.lesson()).isSameAs(first);
        assertThat(result.fromSchedule()).isFalse();
    }

    @Test
    void excludesTodaysStartedLessonsAndIncludesNullStartByDate() {
        Lesson timeless = lesson(today, null, LessonStatus.SCHEDULED);
        when(lessons.findByEnrollmentStudentIdAndDateGreaterThanEqual(studentId, today)).thenReturn(List.of(
            lesson(today, LocalTime.of(23, 0), LessonStatus.SCHEDULED), timeless));

        assertThat(useCase.get().nextLesson().lesson()).isSameAs(timeless);
    }

    @Test
    void lessonStartingExactlyNowIsExcluded() {
        when(lessons.findByEnrollmentStudentIdAndDateGreaterThanEqual(studentId, today)).thenReturn(List.of(
            lesson(today, LocalTime.of(23, 30), LessonStatus.SCHEDULED)));

        assertThat(useCase.get().nextLesson()).isNull();
    }

    @Test
    void derivesNextScheduleOccurrenceInApplicationZoneWithoutSavingALesson() {
        scheduled(Weekday.SUNDAY, LocalTime.of(23, 45));
        when(practice.weeklyPracticeMin(studentId)).thenReturn(85);

        var dashboard = useCase.get();
        var next = dashboard.nextLesson();

        assertThat(next.fromSchedule()).isTrue();
        assertThat(next.lesson().getId()).isNull();
        assertThat(next.lesson().getDate()).isEqualTo(today);
        assertThat(next.lesson().getStatus()).isEqualTo(LessonStatus.SCHEDULED);
        verify(lessons, never()).save(any());
        assertThat(dashboard.weeklyPracticeMin()).isEqualTo(85);
        verify(practice).weeklyPracticeMin(studentId);
    }

    @Test
    void rollsStartedScheduleToNextWeek() {
        scheduled(Weekday.SUNDAY, LocalTime.of(22, 0));

        assertThat(useCase.get().nextLesson().lesson().getDate()).isEqualTo(today.plusWeeks(1));
    }

    @Test
    void scheduleCanPrecedeARealLesson() {
        scheduled(Weekday.MONDAY, LocalTime.of(9, 0));
        when(lessons.findByEnrollmentStudentIdAndDateGreaterThanEqual(studentId, today)).thenReturn(List.of(
            lesson(today.plusDays(2), LocalTime.of(9, 0), LessonStatus.SCHEDULED)));

        assertThat(useCase.get().nextLesson().fromSchedule()).isTrue();
    }

    @Test
    void aRegisteredLessonAtTheSameEnrollmentDateAndTimeWins() {
        scheduled(Weekday.MONDAY, LocalTime.of(9, 0));
        Lesson registered = lesson(today.plusDays(1), LocalTime.of(9, 0), LessonStatus.SCHEDULED);
        when(lessons.findByEnrollmentStudentIdAndDateGreaterThanEqual(studentId, today)).thenReturn(List.of(registered));

        assertThat(useCase.get().nextLesson().lesson()).isSameAs(registered);
        assertThat(useCase.get().nextLesson().fromSchedule()).isFalse();
    }

    @Test
    void canceledOccurrenceIsNotResurrectedBySchedule() {
        scheduled(Weekday.MONDAY, LocalTime.of(9, 0));
        when(lessons.findByEnrollmentStudentIdAndDateGreaterThanEqual(studentId, today)).thenReturn(List.of(
            lesson(today.plusDays(1), LocalTime.of(9, 0), LessonStatus.CANCELED)));

        assertThat(useCase.get().nextLesson().lesson().getDate()).isEqualTo(today.plusDays(8));
    }

    @Test
    void scheduleDoesNotPrecedeEnrollmentStartDate() {
        enrollment.setStartDate(today.plusDays(10));
        scheduled(Weekday.MONDAY, LocalTime.of(9, 0));

        assertThat(useCase.get().nextLesson().lesson().getDate()).isEqualTo(today.plusDays(15));
    }
}
