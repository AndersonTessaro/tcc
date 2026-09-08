package br.com.harmonia.lessoncore;

import java.util.EnumSet;
import java.util.Map;
import java.util.Objects;

/** Defines the valid lifecycle of a lesson. Terminal lessons cannot be reopened implicitly. */
public final class LessonLifecyclePolicy {
    private static final Map<SessionStatus, EnumSet<SessionStatus>> ALLOWED = Map.of(
        SessionStatus.SCHEDULED, EnumSet.of(SessionStatus.DONE, SessionStatus.CANCELED),
        SessionStatus.DONE, EnumSet.noneOf(SessionStatus.class),
        SessionStatus.CANCELED, EnumSet.noneOf(SessionStatus.class)
    );

    public void validateTransition(SessionStatus current, SessionStatus next) {
        Objects.requireNonNull(current, "current status is required");
        Objects.requireNonNull(next, "next status is required");
        if (current != next && !ALLOWED.get(current).contains(next)) {
            throw new DomainValidationException("Invalid lesson status transition from " + current + " to " + next);
        }
    }
}
