package br.com.harmonia.domain.gamification;

import br.com.harmonia.lessoncore.DomainValidationException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PracticeEntryRuleTest {
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 29);

    @Test
    void validate_todayWithinDailyLimit_accepts() {
        assertThatCode(() -> PracticeEntryRule.validate(60, TODAY, TODAY, 1380)).doesNotThrowAnyException();
        assertThatCode(() -> PracticeEntryRule.validate(30, TODAY.minusDays(30), TODAY, 0)).doesNotThrowAnyException();
    }

    @Test
    void validate_durationOutOfRange_rejects() {
        assertThatThrownBy(() -> PracticeEntryRule.validate(0, TODAY, TODAY, 0))
            .isInstanceOf(DomainValidationException.class).hasMessageContaining("between 1 and 1440");
        assertThatThrownBy(() -> PracticeEntryRule.validate(1441, TODAY, TODAY, 0))
            .hasMessageContaining("between 1 and 1440");
    }

    @Test
    void validate_futureDate_rejects() {
        assertThatThrownBy(() -> PracticeEntryRule.validate(30, TODAY.plusDays(1), TODAY, 0))
            .hasMessage("Practice date cannot be in the future");
    }

    @Test
    void validate_dateOlderThan30Days_rejects() {
        assertThatThrownBy(() -> PracticeEntryRule.validate(30, TODAY.minusDays(31), TODAY, 0))
            .hasMessage("Practice date cannot be more than 30 days ago");
    }

    @Test
    void validate_dayTotalAbove24Hours_rejects() {
        assertThatThrownBy(() -> PracticeEntryRule.validate(61, TODAY, TODAY, 1380))
            .hasMessage("Practice for a single day cannot exceed 24 hours");
    }
}
