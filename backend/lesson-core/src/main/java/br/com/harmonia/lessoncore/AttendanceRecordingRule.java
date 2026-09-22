package br.com.harmonia.lessoncore;

import java.time.LocalDate;
import java.util.Objects;

public final class AttendanceRecordingRule {

    public void validateRecordable(SessionStatus lessonStatus, LocalDate lessonDate, LocalDate today) {
        Objects.requireNonNull(lessonStatus, "lessonStatus is required");
        Objects.requireNonNull(lessonDate, "lessonDate is required");
        Objects.requireNonNull(today, "today is required");
        if (lessonStatus == SessionStatus.CANCELED) {
            throw new DomainValidationException("Attendance cannot be recorded for a canceled lesson");
        }
        if (lessonDate.isAfter(today)) {
            throw new DomainValidationException("Attendance cannot be recorded before the lesson date");
        }
    }

    public AttendanceEffect evaluate(AttendanceOutcome previousOutcome, AttendanceOutcome newOutcome) {
        if (newOutcome == null) {
            throw new DomainValidationException("Attendance outcome is required");
        }
        if (previousOutcome != AttendanceOutcome.PRESENT && newOutcome == AttendanceOutcome.PRESENT) {
            return AttendanceEffect.AWARD_XP;
        }
        if (previousOutcome == AttendanceOutcome.PRESENT && newOutcome != AttendanceOutcome.PRESENT) {
            return AttendanceEffect.REVOKE_XP;
        }
        return AttendanceEffect.NONE;
    }
}
