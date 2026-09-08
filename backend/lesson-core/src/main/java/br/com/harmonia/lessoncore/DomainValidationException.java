package br.com.harmonia.lessoncore;

/** Signals that a command violates a lesson-domain invariant. */
public class DomainValidationException extends RuntimeException {
    public DomainValidationException(String message) {
        super(message);
    }
}
