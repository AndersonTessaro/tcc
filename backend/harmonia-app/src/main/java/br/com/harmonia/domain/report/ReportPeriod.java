package br.com.harmonia.domain.report;

import br.com.harmonia.lessoncore.DomainValidationException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public record ReportPeriod(LocalDate from, LocalDate to) {
    public static final int DEFAULT_DAYS = 30;
    public static final int MAX_DAYS = 366;

    public ReportPeriod {
        if (from.isAfter(to))
            throw new DomainValidationException("Report start must not be after its end");
        if (ChronoUnit.DAYS.between(from, to) + 1 > MAX_DAYS)
            throw new DomainValidationException("Report period cannot exceed 366 days");
    }

    public static ReportPeriod of(LocalDate from, LocalDate to, LocalDate today) {
        LocalDate end = to == null || to.isAfter(today) ? today : to;
        LocalDate start = from == null ? end.minusDays(DEFAULT_DAYS - 1) : from;
        return new ReportPeriod(start, end);
    }
}
