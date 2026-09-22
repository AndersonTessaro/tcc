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

    public void validateTransition(SessionStatus current, SessionStatus next) {
        Objects.requireNonNull(current, "current status is required");
        Objects.requireNonNull(next, "next status is required");
        if (current != next && !ALLOWED.get(current).contains(next)) {
            throw new DomainValidationException("Invalid lesson status transition from " + current + " to " + next);
        }
    }
}
