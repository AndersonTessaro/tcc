package br.com.harmonia.domain.gamification;

import br.com.harmonia.domain.gamification.GoalProgressCalculator.Facts;
import br.com.harmonia.domain.gamification.GoalProgressCalculator.Metric;
import br.com.harmonia.domain.gamification.GoalProgressCalculator.PracticeFact;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class GoalProgressCalculatorTest {
    private static final LocalDate WEDNESDAY = LocalDate.of(2026, 10, 21);
    private final GoalProgressCalculator calculator = new GoalProgressCalculator();

    private static Facts practices(PracticeFact... facts) {
        return new Facts(List.of(facts), List.of());
    }

    @Test
    void periodWindows() {
        assertThat(GoalPeriod.WEEKLY.start(WEDNESDAY)).isEqualTo(LocalDate.of(2026, 10, 19));
        assertThat(GoalPeriod.WEEKLY.end(WEDNESDAY)).isEqualTo(LocalDate.of(2026, 10, 25));
        assertThat(GoalPeriod.MONTHLY.start(WEDNESDAY)).isEqualTo(LocalDate.of(2026, 10, 1));
        assertThat(GoalPeriod.MONTHLY.end(LocalDate.of(2027, 2, 10))).isEqualTo(LocalDate.of(2027, 2, 28));
        assertThat(GoalPeriod.DAILY.end(WEDNESDAY)).isEqualTo(WEDNESDAY);
        assertThat(GoalPeriod.MONTHLY.previousStart(LocalDate.of(2026, 3, 1))).isEqualTo(LocalDate.of(2026, 2, 1));
    }

    @Test
    void practiceTime_sumsOnlyTheCurrentWeek() {
        var facts = practices(new PracticeFact(LocalDate.of(2026, 10, 18), 90),
            new PracticeFact(LocalDate.of(2026, 10, 19), 30), new PracticeFact(WEDNESDAY, 45));

        var progress = calculator.calculate(Metric.PRACTICE_TIME, GoalPeriod.WEEKLY, 180, WEDNESDAY, WEDNESDAY, facts);

        assertThat(progress.current()).isEqualTo(75);
        assertThat(progress.achieved()).isFalse();
        assertThat(progress.periodStart()).isEqualTo(LocalDate.of(2026, 10, 19));
        assertThat(progress.streak()).isZero();
    }

    @Test
    void practiceDays_countsDistinctDates() {
        var facts = practices(new PracticeFact(WEDNESDAY, 10), new PracticeFact(WEDNESDAY, 20),
            new PracticeFact(WEDNESDAY.minusDays(1), 15));

        var progress = calculator.calculate(Metric.PRACTICE_DAYS, GoalPeriod.WEEKLY, 2, WEDNESDAY, WEDNESDAY, facts);

        assertThat(progress.current()).isEqualTo(2);
        assertThat(progress.achieved()).isTrue();
        assertThat(progress.streak()).isEqualTo(1);
    }

    @Test
    void attendance_countsPresentLessonsInTheMonth() {
        var facts = new Facts(List.of(), List.of(LocalDate.of(2026, 9, 30), LocalDate.of(2026, 10, 2), LocalDate.of(2026, 10, 9)));

        var progress = calculator.calculate(Metric.ATTENDANCE, GoalPeriod.MONTHLY, 4, LocalDate.of(2026, 9, 1), WEDNESDAY, facts);

        assertThat(progress.current()).isEqualTo(2);
        assertThat(progress.streak()).isZero();
    }

    @Test
    void streak_countsConsecutivePastPeriodsAndStopsAtAGap() {
        LocalDate created = LocalDate.of(2026, 9, 1);
        var facts = practices(new PracticeFact(LocalDate.of(2026, 9, 29), 60),
            new PracticeFact(LocalDate.of(2026, 10, 6), 60), new PracticeFact(LocalDate.of(2026, 10, 13), 60));

        var progress = calculator.calculate(Metric.PRACTICE_TIME, GoalPeriod.WEEKLY, 60, created, WEDNESDAY, facts);

        assertThat(progress.achieved()).isFalse();
        assertThat(progress.streak()).isEqualTo(3);
    }

    @Test
    void streak_ignoresPeriodsBeforeTheGoalExisted() {
        var facts = practices(new PracticeFact(WEDNESDAY.minusDays(1), 30), new PracticeFact(WEDNESDAY, 30));

        var progress = calculator.calculate(Metric.PRACTICE_TIME, GoalPeriod.DAILY, 30, WEDNESDAY, WEDNESDAY, facts);

        assertThat(progress.streak()).isEqualTo(1);
    }

    @Test
    void earliestNeeded_isCappedByTheStreakLimit() {
        assertThat(calculator.earliestNeeded(GoalPeriod.DAILY, WEDNESDAY.minusDays(3), WEDNESDAY))
            .isEqualTo(WEDNESDAY.minusDays(3));
        assertThat(calculator.earliestNeeded(GoalPeriod.DAILY, LocalDate.of(2020, 1, 1), WEDNESDAY))
            .isEqualTo(WEDNESDAY.minusDays(GoalProgressCalculator.MAX_STREAK_PERIODS));
    }
}
