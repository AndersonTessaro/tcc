package br.com.harmonia.application.student;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.gamification.ProgressUseCase;
import br.com.harmonia.application.gamification.PracticeUseCase;
import br.com.harmonia.application.lesson.port.LessonRepository;
import br.com.harmonia.application.schedule.port.ScheduleRepository;
import br.com.harmonia.infrastructure.persistence.gamification.Progress;
import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import br.com.harmonia.infrastructure.persistence.lesson.LessonStatus;
import br.com.harmonia.infrastructure.persistence.profile.EnrollmentStatus;
import br.com.harmonia.infrastructure.persistence.schedule.Schedule;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

@Service
public class StudentDashboardUseCase {
    private final CurrentUserService current;
    private final ProgressUseCase progress;
    private final PracticeUseCase practice;
    private final LessonRepository lessons;
    private final ScheduleRepository schedules;
    private final Clock clock;

    public StudentDashboardUseCase(CurrentUserService current, ProgressUseCase progress, PracticeUseCase practice,
                                   LessonRepository lessons, ScheduleRepository schedules, Clock clock) {
        this.current = current;
        this.progress = progress;
        this.practice = practice;
        this.lessons = lessons;
        this.schedules = schedules;
        this.clock = clock;
    }

    public record NextLesson(Lesson lesson, boolean fromSchedule) {}
    public record Dashboard(Progress progress, int weeklyPracticeMin, NextLesson nextLesson) {}

    @Transactional(readOnly = true)
    public Dashboard get() {
        var studentId = current.currentStudent().getId();
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDate today = now.toLocalDate();
        List<Lesson> upcoming = lessons.findByEnrollmentStudentIdAndDateGreaterThanEqual(studentId, today);
        Stream<NextLesson> registered = upcoming.stream()
            .filter(lesson -> lesson.getStatus() == LessonStatus.SCHEDULED)
            .filter(lesson -> lesson.getDate().isAfter(today) || lesson.getStartTime() == null
                || lesson.getStartTime().isAfter(now.toLocalTime()))
            .map(lesson -> new NextLesson(lesson, false));
        Stream<NextLesson> recurring = schedules.findByEnrollmentStudentIdAndActiveTrueAndEnrollmentStatus(
                studentId, EnrollmentStatus.ACTIVE).stream()
            .map(schedule -> occurrence(schedule, now, upcoming));
        NextLesson next = Stream.concat(registered, recurring)
            .min(Comparator.comparing((NextLesson item) -> item.lesson().getDate())
                .thenComparing(item -> item.lesson().getStartTime(), Comparator.nullsFirst(Comparator.naturalOrder()))
                .thenComparing(NextLesson::fromSchedule)).orElse(null);
        return new Dashboard(progress.myProgress(), practice.weeklyPracticeMin(studentId), next);
    }

    private NextLesson occurrence(Schedule schedule, LocalDateTime now, List<Lesson> registered) {
        LocalDate first = now.toLocalDate().isAfter(schedule.getEnrollment().getStartDate())
            ? now.toLocalDate() : schedule.getEnrollment().getStartDate();
        LocalDate date = first.with(TemporalAdjusters.nextOrSame(DayOfWeek.valueOf(schedule.getWeekday().name())));
        if (!date.atTime(schedule.getStartTime()).isAfter(now)) date = date.plusWeeks(1);
        while (hasLesson(registered, schedule, date)) date = date.plusWeeks(1);
        Lesson lesson = new Lesson();
        lesson.setEnrollment(schedule.getEnrollment());
        lesson.setDate(date);
        lesson.setStartTime(schedule.getStartTime());
        lesson.setEndTime(schedule.getEndTime());
        lesson.setStatus(LessonStatus.SCHEDULED);
        return new NextLesson(lesson, true);
    }

    private boolean hasLesson(List<Lesson> registered, Schedule schedule, LocalDate date) {
        return registered.stream().anyMatch(lesson -> lesson.getEnrollment().getId().equals(schedule.getEnrollment().getId())
            && lesson.getDate().equals(date) && schedule.getStartTime().equals(lesson.getStartTime()));
    }
}
