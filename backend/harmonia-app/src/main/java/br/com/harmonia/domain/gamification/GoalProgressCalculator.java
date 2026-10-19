package br.com.harmonia.domain.gamification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public final class GoalProgressCalculator {
    public static final int MAX_STREAK_PERIODS = 52;

    public enum Metric { PRACTICE_TIME, PRACTICE_DAYS, ATTENDANCE }

    public record PracticeFact(LocalDate date, int minutes) {}

    public record Facts(List<PracticeFact> practices, List<LocalDate> presentLessonDates) {
        public Facts withoutPractice(LocalDate date, int minutes) {
            var remaining = new ArrayList<>(practices);
            remaining.remove(new PracticeFact(date, minutes));
            return new Facts(List.copyOf(remaining), presentLessonDates);
        }

        public Facts withoutPresence(LocalDate date) {
            var remaining = new ArrayList<>(presentLessonDates);
            remaining.remove(date);
            return new Facts(practices, List.copyOf(remaining));
        }
    }

    public record Progress(LocalDate periodStart, LocalDate periodEnd, int current, boolean achieved, int streak) {}

    public Progress calculate(Metric metric, GoalPeriod period, int target, LocalDate createdOn, LocalDate today, Facts facts) {
        LocalDate start = period.start(today);
        int current = amount(metric, start, period.end(today), facts);
        boolean achieved = current >= target;
        int streak = achieved ? 1 : 0;
        LocalDate firstPeriod = period.start(createdOn);
        LocalDate previous = period.previousStart(start);
        for (int i = 0; i < MAX_STREAK_PERIODS && !previous.isBefore(firstPeriod); i++) {
            if (amount(metric, previous, period.end(previous), facts) < target) break;
            streak++;
            previous = period.previousStart(previous);
        }
        return new Progress(start, period.end(today), current, achieved, streak);
    }

    public LocalDate earliestNeeded(GoalPeriod period, LocalDate createdOn, LocalDate today) {
        LocalDate limit = period.start(today);
        for (int i = 0; i < MAX_STREAK_PERIODS; i++) limit = period.previousStart(limit);
        LocalDate first = period.start(createdOn);
        return first.isAfter(limit) ? first : limit;
    }

    private int amount(Metric metric, LocalDate from, LocalDate to, Facts facts) {
        return switch (metric) {
            case PRACTICE_TIME -> facts.practices().stream()
                .filter(p -> within(p.date(), from, to)).mapToInt(PracticeFact::minutes).sum();
            case PRACTICE_DAYS -> (int) facts.practices().stream()
                .map(PracticeFact::date).filter(d -> within(d, from, to)).distinct().count();
            case ATTENDANCE -> (int) facts.presentLessonDates().stream()
                .filter(d -> within(d, from, to)).count();
        };
    }

    private static boolean within(LocalDate date, LocalDate from, LocalDate to) {
        return !date.isBefore(from) && !date.isAfter(to);
    }
}
