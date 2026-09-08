package br.com.harmonia.lessoncore;

import java.time.LocalTime;
import java.util.Objects;

/** A non-empty time interval within one day. End times are exclusive. */
public record TimeRange(LocalTime start, LocalTime end) {
    public TimeRange {
        Objects.requireNonNull(start, "start is required");
        Objects.requireNonNull(end, "end is required");
        if (!end.isAfter(start)) {
            throw new DomainValidationException("End time must be after start time");
        }
    }

    public boolean overlaps(TimeRange other) {
        Objects.requireNonNull(other, "other is required");
        return start.isBefore(other.end) && other.start.isBefore(end);
    }
}
