package br.com.harmonia.application.gamification;

import br.com.harmonia.application.gamification.port.GoalRepository;
import br.com.harmonia.application.gamification.port.PracticeRepository;
import br.com.harmonia.application.lesson.port.AttendanceRepository;
import br.com.harmonia.domain.gamification.GoalCompletedEvent;
import br.com.harmonia.domain.gamification.GoalProgressCalculator;
import br.com.harmonia.domain.gamification.GoalProgressCalculator.Facts;
import br.com.harmonia.domain.gamification.GoalProgressCalculator.Metric;
import br.com.harmonia.domain.gamification.GoalProgressCalculator.PracticeFact;
import br.com.harmonia.domain.gamification.GoalProgressCalculator.Progress;
import br.com.harmonia.infrastructure.persistence.gamification.Goal;
import br.com.harmonia.infrastructure.persistence.gamification.GoalStatus;
import br.com.harmonia.infrastructure.persistence.lesson.AttendanceStatus;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.UnaryOperator;

@Service
@Transactional
public class GoalProgressService {
    private final GoalRepository goals;
    private final PracticeRepository practices;
    private final AttendanceRepository attendances;
    private final ApplicationEventPublisher events;
    private final GoalProgressCalculator calculator = new GoalProgressCalculator();

    public GoalProgressService(GoalRepository goals, PracticeRepository practices, AttendanceRepository attendances,
                               ApplicationEventPublisher events) {
        this.goals = goals;
        this.practices = practices;
        this.attendances = attendances;
        this.events = events;
    }

    public Map<UUID, Progress> progressOf(UUID studentId, Collection<Goal> candidates) {
        List<Goal> tracked = candidates.stream().filter(GoalProgressService::isTracked).toList();
        Map<UUID, Progress> result = new HashMap<>();
        if (tracked.isEmpty()) return result;
        LocalDate today = LocalDate.now();
        LocalDate from = tracked.stream()
            .map(goal -> calculator.earliestNeeded(goal.getPeriod(), goal.getCreatedAt().toLocalDate(), referenceDay(goal, today)))
            .min(LocalDate::compareTo).orElse(today);
        Facts facts = facts(studentId, from, today);
        tracked.forEach(goal -> {
            Progress progress = calculate(goal, facts, referenceDay(goal, today));
            result.put(goal.getId(), progress);
            if (goal.getStatus() == GoalStatus.ACTIVE && progress.achieved()) complete(studentId, goal);
        });
        return result;
    }

    public void notifyReached(UUID studentId, UnaryOperator<Facts> undo) {
        List<Goal> tracked = goals.findByStudentIdAndStatusAndPeriodIsNotNull(studentId, GoalStatus.ACTIVE);
        if (tracked.isEmpty()) return;
        LocalDate today = LocalDate.now();
        Facts after = facts(studentId, earliest(tracked, today), today);
        Facts before = undo.apply(after);
        for (Goal goal : tracked) {
            if (calculate(goal, after, today).achieved() && !calculate(goal, before, today).achieved())
                complete(studentId, goal);
        }
    }

    private void complete(UUID studentId, Goal goal) {
        goal.setStatus(GoalStatus.ENDED);
        goal.setEndedAt(LocalDateTime.now());
        goal.setCompletedAt(goal.getEndedAt());
        goal.setCompleted(true);
        goals.save(goal);
        events.publishEvent(new GoalCompletedEvent(studentId, goal.getId(), goal.getTitle()));
    }

    private static boolean isTracked(Goal goal) {
        return !goal.isLegacy() && (goal.getStatus() == GoalStatus.ACTIVE || goal.getEndedAt() != null);
    }

    private static LocalDate referenceDay(Goal goal, LocalDate today) {
        return goal.getStatus() == GoalStatus.ACTIVE ? today : goal.getEndedAt().toLocalDate();
    }

    private Progress calculate(Goal goal, Facts facts, LocalDate today) {
        return calculator.calculate(Metric.valueOf(goal.getType().name()), goal.getPeriod(), goal.getTarget(),
            goal.getCreatedAt().toLocalDate(), today, facts);
    }

    private LocalDate earliest(List<Goal> tracked, LocalDate today) {
        return tracked.stream()
            .map(goal -> calculator.earliestNeeded(goal.getPeriod(), goal.getCreatedAt().toLocalDate(), today))
            .min(LocalDate::compareTo).orElse(today);
    }

    private Facts facts(UUID studentId, LocalDate from, LocalDate to) {
        List<PracticeFact> practiced = practices.findByStudentIdAndDateBetween(studentId, from, to).stream()
            .map(p -> new PracticeFact(p.getDate(), p.getDurationMin())).toList();
        List<LocalDate> present = attendances
            .findByLessonEnrollmentStudentIdAndStatusAndLessonDateBetween(studentId, AttendanceStatus.PRESENT, from, to)
            .stream().map(a -> a.getLesson().getDate()).toList();
        return new Facts(practiced, present);
    }
}
