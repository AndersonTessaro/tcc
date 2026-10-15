package br.com.harmonia.lessoncore;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.Map;
import java.util.Objects;

public final class LessonLifecyclePolicy {
    private static final Map<SessionStatus, EnumSet<SessionStatus>> ALLOWED = Map.of(
        SessionStatus.SCHEDULED, EnumSet.of(SessionStatus.DONE, SessionStatus.CANCELED),
        SessionStatus.DONE, EnumSet.noneOf(SessionStatus.class),
        SessionStatus.CANCELED, EnumSet.noneOf(SessionStatus.class)
    );

    public SessionStatus initialStatus(LocalDate lessonDate, LocalDate today) {
        Objects.requireNonNull(lessonDate, "lessonDate is required");
        Objects.requireNonNull(today, "today is required");
        return lessonDate.isAfter(today) ? SessionStatus.SCHEDULED : SessionStatus.DONE;
    }

    public void validateContentEdit(SessionStatus current) {
        Objects.requireNonNull(current, "current status is required");
        if (current == SessionStatus.CANCELED) {
            throw new DomainValidationException("Canceled lessons cannot be edited");
        }
    }

    public void validateReschedule(SessionStatus current, LocalDate newDate, LocalDate today, boolean hasAttendance) {
        Objects.requireNonNull(current, "current status is required");
        Objects.requireNonNull(newDate, "newDate is required");
        Objects.requireNonNull(today, "today is required");
        if (current != SessionStatus.SCHEDULED) {
            throw new DomainValidationException("Only scheduled lessons can be rescheduled");
        }
        if (newDate.isBefore(today)) {
            throw new DomainValidationException("Lesson cannot be moved to a past date");
        }
        if (hasAttendance) {
            throw new DomainValidationException("Lesson with recorded attendance cannot be rescheduled");
        }
    }

    public void validateTransition(SessionStatus current, SessionStatus next) {
        Objects.requireNonNull(current, "current status is required");
        Objects.requireNonNull(next, "next status is required");
        if (current != next && !ALLOWED.get(current).contains(next)) {
            throw new DomainValidationException("Invalid lesson status transition from " + current + " to " + next);
        }
    }
}
