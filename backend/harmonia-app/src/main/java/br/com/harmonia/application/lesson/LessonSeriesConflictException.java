package br.com.harmonia.application.lesson;

import br.com.harmonia.lessoncore.DomainValidationException;

import java.time.LocalDate;
import java.util.List;

public final class LessonSeriesConflictException extends DomainValidationException {
    private final List<LocalDate> dates;

    public LessonSeriesConflictException(List<LocalDate> dates) {
        super("Lesson series conflicts with existing lessons or recurring schedules");
        this.dates = dates.stream().distinct().sorted().toList();
    }

    public List<LocalDate> dates() {
        return dates;
    }
}
