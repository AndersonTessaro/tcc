package br.com.harmonia.lessoncore;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AttendanceRecordingRuleTest {
    private final AttendanceRecordingRule rule = new AttendanceRecordingRule();

    @Test
    void firstRecordingPresent_awardsXp() {
        assertThat(rule.evaluate(null, AttendanceOutcome.PRESENT)).isEqualTo(AttendanceEffect.AWARD_XP);
    }

    @Test
    void firstRecordingAbsent_hasNoXpEffect() {
        assertThat(rule.evaluate(null, AttendanceOutcome.ABSENT)).isEqualTo(AttendanceEffect.NONE);
    }

    @Test
    void correctionFromAbsentToPresent_awardsXp() {
        assertThat(rule.evaluate(AttendanceOutcome.ABSENT, AttendanceOutcome.PRESENT))
            .isEqualTo(AttendanceEffect.AWARD_XP);
    }

    @Test
    void correctionFromPresentToAbsent_revokesXp() {
        assertThat(rule.evaluate(AttendanceOutcome.PRESENT, AttendanceOutcome.ABSENT))
            .isEqualTo(AttendanceEffect.REVOKE_XP);
    }

    @Test
    void correctionFromPresentToExcused_revokesXp() {
        assertThat(rule.evaluate(AttendanceOutcome.PRESENT, AttendanceOutcome.EXCUSED))
            .isEqualTo(AttendanceEffect.REVOKE_XP);
    }

    @Test
    void reRecordingTheSameOutcome_hasNoXpEffect() {
        assertThat(rule.evaluate(AttendanceOutcome.PRESENT, AttendanceOutcome.PRESENT))
            .isEqualTo(AttendanceEffect.NONE);
        assertThat(rule.evaluate(AttendanceOutcome.ABSENT, AttendanceOutcome.ABSENT))
            .isEqualTo(AttendanceEffect.NONE);
    }

    @Test
    void missingOutcome_throws() {
        assertThatThrownBy(() -> rule.evaluate(AttendanceOutcome.PRESENT, null))
            .isInstanceOf(DomainValidationException.class)
            .hasMessageContaining("required");
    }
}
