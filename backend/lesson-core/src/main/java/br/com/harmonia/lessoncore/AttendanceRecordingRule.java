package br.com.harmonia.lessoncore;

public final class AttendanceRecordingRule {
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
