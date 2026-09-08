package br.com.harmonia.lessoncore;

import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

/** Framework-neutral representation of one scheduled lesson. */
public record LessonSlot(UUID lessonId, UUID teacherId, UUID studentId, LocalDate date,
                         TimeRange timeRange, SessionStatus status) {
    public LessonSlot {
        Objects.requireNonNull(lessonId, "lessonId is required");
        Objects.requireNonNull(teacherId, "teacherId is required");
        Objects.requireNonNull(studentId, "studentId is required");
        Objects.requireNonNull(date, "date is required");
        Objects.requireNonNull(timeRange, "timeRange is required");
        Objects.requireNonNull(status, "status is required");
    }
}
