package br.com.harmonia.domain.report;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public final class ReportMath {
    public record WeekTotal(LocalDate weekStart, long minutes) {}

    private ReportMath() {}

    public static Integer percent(long part, long whole) {
        return whole == 0 ? null : (int) Math.round(100.0 * part / whole);
    }

    public static Double average(long sum, long count) {
        return count == 0 ? null : Math.round(10.0 * sum / count) / 10.0;
    }

    public static List<WeekTotal> weekly(Map<LocalDate, Long> dailyMinutes, ReportPeriod period) {
        Map<LocalDate, Long> weeks = new TreeMap<>();
        for (LocalDate week = monday(period.from()); !week.isAfter(period.to()); week = week.plusWeeks(1))
            weeks.put(week, 0L);
        dailyMinutes.forEach((day, minutes) -> weeks.merge(monday(day), minutes, Long::sum));
        return weeks.entrySet().stream().map(e -> new WeekTotal(e.getKey(), e.getValue())).toList();
    }

    private static LocalDate monday(LocalDate day) {
        return day.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }
}
