package br.com.harmonia.lessoncore;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AttendanceRecordingRuleTest {

    private final AttendanceRecordingRule rule = new AttendanceRecordingRule();

    @Test
    void firstRecordingPresent_isXpEligible() {
        AttendanceDecision decision = rule.evaluate(null, AttendanceOutcome.PRESENT);

        assertThat(decision.isFirstRecording()).isTrue();
        assertThat(decision.xpEligible()).isTrue();
    }

    @Test
    void firstRecordingAbsent_isNotXpEligible() {
        AttendanceDecision decision = rule.evaluate(null, AttendanceOutcome.ABSENT);

        assertThat(decision.isFirstRecording()).isTrue();
        assertThat(decision.xpEligible()).isFalse();
    }

    @Test
    void reRecordingToPresent_isNotXpEligible() {
        AttendanceDecision decision = rule.evaluate(AttendanceOutcome.ABSENT, AttendanceOutcome.PRESENT);

        assertThat(decision.isFirstRecording()).isFalse();
        assertThat(decision.xpEligible()).isFalse();
    }
}
