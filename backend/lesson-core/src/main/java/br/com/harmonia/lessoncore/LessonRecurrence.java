package br.com.harmonia.lessoncore;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public enum LessonRecurrence {
    NONE, WEEKLY, BIWEEKLY, MONTHLY;

    public static final int MAX_OCCURRENCES = 60;

    public List<LocalDate> occurrences(LocalDate first, LocalDate until) {
        Objects.requireNonNull(first, "first date is required");
        if (this == NONE) return List.of(first);
        if (until == null) {
            throw new DomainValidationException("repeatUntil is required for recurring lessons");
        }
        if (until.isBefore(first)) {
            throw new DomainValidationException("repeatUntil cannot be before the first lesson date");
        }
        if (until.isAfter(first.plusMonths(12))) {
            throw new DomainValidationException("repeatUntil cannot be more than 12 months after the first lesson date");
        }
        return generateOccurrences(first, until);
    }

    List<LocalDate> generateOccurrences(LocalDate first, LocalDate until) {
        if (this == NONE) return List.of(first);
        List<LocalDate> dates = new ArrayList<>();
        for (int index = 0; ; index++) {
            LocalDate date = switch (this) {
                case WEEKLY -> first.plusDays(index * 7L);
                case BIWEEKLY -> first.plusDays(index * 14L);
                case MONTHLY -> first.plusMonths(index);
                case NONE -> first;
            };
            if (date.isAfter(until)) return List.copyOf(dates);
            if (dates.size() == MAX_OCCURRENCES) {
                throw new DomainValidationException("Lesson series cannot exceed " + MAX_OCCURRENCES + " occurrences");
            }
            dates.add(date);
        }
    }
}
