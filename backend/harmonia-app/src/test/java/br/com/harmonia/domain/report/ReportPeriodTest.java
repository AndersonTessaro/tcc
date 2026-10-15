package br.com.harmonia.domain.report;

import br.com.harmonia.lessoncore.DomainValidationException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ReportPeriodTest {
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 15);

    @Test
    void defaultsToTheLastThirtyDays() {
        assertThat(ReportPeriod.of(null, null, TODAY))
            .isEqualTo(new ReportPeriod(LocalDate.of(2026, 9, 16), TODAY));
    }

    @Test
    void clampsAFutureEndToToday() {
        assertThat(ReportPeriod.of(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 12, 1), TODAY).to()).isEqualTo(TODAY);
    }

    @Test
    void rejectsStartAfterEnd() {
        assertThatThrownBy(() -> ReportPeriod.of(LocalDate.of(2026, 10, 10), LocalDate.of(2026, 10, 1), TODAY))
            .isInstanceOf(DomainValidationException.class);
    }

    @Test
    void acceptsUpTo366Days() {
        assertThat(ReportPeriod.of(TODAY.minusDays(365), TODAY, TODAY).from()).isEqualTo(TODAY.minusDays(365));
        assertThatThrownBy(() -> ReportPeriod.of(TODAY.minusDays(366), TODAY, TODAY))
            .isInstanceOf(DomainValidationException.class);
    }
}
