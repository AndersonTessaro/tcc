package br.com.harmonia.lessoncore;

/**
 * RN07/RN08/RN09: translates an attendance state transition into an idempotent XP effect.
 *
 * <p>The effect depends on the transition, not on how many times attendance was recorded, so
 * re-recording the same outcome yields {@link AttendanceEffect#NONE} and corrections are reversible.
 */
public final class AttendanceRecordingRule {

    /**
     * @param previousOutcome the outcome already recorded for the lesson, or {@code null} on a first recording
     * @param newOutcome      the outcome being recorded now
     */
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
