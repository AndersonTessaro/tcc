package br.com.harmonia.lessoncore;

public final class ScheduleConflictException extends DomainValidationException {
    public ScheduleConflictException(String message) {
        super(message);
    }
}
