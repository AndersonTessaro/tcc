package br.com.harmonia.domain.gamification;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

public enum GoalPeriod {
    DAILY, WEEKLY, MONTHLY;

    public LocalDate start(LocalDate day) {
        return switch (this) {
            case DAILY -> day;
            case WEEKLY -> day.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            case MONTHLY -> day.withDayOfMonth(1);
        };
    }

    public LocalDate end(LocalDate day) {
        return switch (this) {
            case DAILY -> day;
            case WEEKLY -> start(day).plusDays(6);
            case MONTHLY -> day.with(TemporalAdjusters.lastDayOfMonth());
        };
    }

    public LocalDate previousStart(LocalDate start) {
        return switch (this) {
            case DAILY -> start.minusDays(1);
            case WEEKLY -> start.minusWeeks(1);
            case MONTHLY -> start.minusMonths(1);
        };
    }

    public int maxDays() {
        return switch (this) {
            case DAILY -> 1;
            case WEEKLY -> 7;
            case MONTHLY -> 31;
        };
    }
}
