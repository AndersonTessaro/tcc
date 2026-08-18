package br.com.harmonia.lessoncore;

/** Outcome of {@link AttendanceRecordingRule#evaluate}. */
public record AttendanceDecision(boolean isFirstRecording, boolean xpEligible) {
}
