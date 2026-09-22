package br.com.harmonia.lessoncore;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AttendanceRecordingRuleTest {
    private final AttendanceRecordingRule rule = new AttendanceRecordingRule();
    private final LocalDate today = LocalDate.of(2026, 9, 22);

    @Test
    void canceledLesson_rejectsAttendance() {
        assertThatThrownBy(() -> rule.validateRecordable(SessionStatus.CANCELED, today, today))
            .isInstanceOf(DomainValidationException.class)
            .hasMessageContaining("canceled");
    }

    @Test
    void futureLesson_rejectsAttendance() {
        assertThatThrownBy(() -> rule.validateRecordable(SessionStatus.SCHEDULED, today.plusDays(1), today))
            .isInstanceOf(DomainValidationException.class)
            .hasMessageContaining("before the lesson date");
    }

    @Test
    void scheduledOrDoneLessonOnOrBeforeToday_acceptsAttendance() {
        assertThatCode(() -> rule.validateRecordable(SessionStatus.SCHEDULED, today, today)).doesNotThrowAnyException();
        assertThatCode(() -> rule.validateRecordable(SessionStatus.DONE, today.minusDays(3), today))
            .doesNotThrowAnyException();
    }

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
