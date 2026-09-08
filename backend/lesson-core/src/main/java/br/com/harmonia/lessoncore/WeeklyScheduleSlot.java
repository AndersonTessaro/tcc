package br.com.harmonia.lessoncore;

import java.time.DayOfWeek;
import java.util.Objects;
import java.util.UUID;

/** A recurring weekly availability reserved for one teacher/student pair. */
public record WeeklyScheduleSlot(UUID scheduleId, UUID teacherId, UUID studentId,
                                 DayOfWeek weekday, TimeRange timeRange) {
    public WeeklyScheduleSlot {
        Objects.requireNonNull(scheduleId, "scheduleId is required");
        Objects.requireNonNull(teacherId, "teacherId is required");
        Objects.requireNonNull(studentId, "studentId is required");
        Objects.requireNonNull(weekday, "weekday is required");
        Objects.requireNonNull(timeRange, "timeRange is required");
    }
}
