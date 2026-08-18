package br.com.harmonia.lessoncore;

/**
 * RN07/RN08/RN09: decides whether an attendance registration is the first record for a lesson
 * and therefore eligible for XP. Re-registering (e.g. correcting a status) never re-awards XP.
 */
public final class AttendanceRecordingRule {

    public AttendanceDecision evaluate(AttendanceOutcome previousOutcome, AttendanceOutcome newOutcome) {
        boolean isFirstRecording = previousOutcome == null;
        boolean xpEligible = isFirstRecording && newOutcome == AttendanceOutcome.PRESENT;
        return new AttendanceDecision(isFirstRecording, xpEligible);
    }
}
