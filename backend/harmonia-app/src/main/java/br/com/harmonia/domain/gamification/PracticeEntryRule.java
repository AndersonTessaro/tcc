package br.com.harmonia.domain.gamification;

import br.com.harmonia.lessoncore.DomainValidationException;

import java.time.LocalDate;

public final class PracticeEntryRule {
    public static final int MINUTES_PER_DAY = 1440;
    public static final int MAX_BACKDATE_DAYS = 30;

    private PracticeEntryRule() {}

    public static void validate(int durationMin, LocalDate date, LocalDate today, int minutesAlreadyOnDate) {
        if (durationMin < 1 || durationMin > MINUTES_PER_DAY)
            throw new DomainValidationException("Practice duration must be between 1 and 1440 minutes");
        if (date.isAfter(today))
            throw new DomainValidationException("Practice date cannot be in the future");
        if (date.isBefore(today.minusDays(MAX_BACKDATE_DAYS)))
            throw new DomainValidationException("Practice date cannot be more than 30 days ago");
        if (minutesAlreadyOnDate + durationMin > MINUTES_PER_DAY)
            throw new DomainValidationException("Practice for a single day cannot exceed 24 hours");
    }
}
