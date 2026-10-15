package br.com.harmonia.domain.report;

import br.com.harmonia.domain.report.ReportMath.WeekTotal;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ReportMathTest {

    @Test
    void percentIsNullWithoutDataAndRounds() {
        assertThat(ReportMath.percent(0, 0)).isNull();
        assertThat(ReportMath.percent(1, 3)).isEqualTo(33);
        assertThat(ReportMath.percent(2, 3)).isEqualTo(67);
    }

    @Test
    void averageIsNullWithoutDataAndKeepsOneDecimal() {
        assertThat(ReportMath.average(0, 0)).isNull();
        assertThat(ReportMath.average(13, 3)).isEqualTo(4.3);
    }

    @Test
    void weeklyStartsOnMondayAndFillsEmptyWeeks() {
        var period = new ReportPeriod(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 15));
        var weeks = ReportMath.weekly(Map.of(
            LocalDate.of(2026, 10, 1), 20L,
            LocalDate.of(2026, 10, 4), 10L,
            LocalDate.of(2026, 10, 14), 45L), period);

        assertThat(weeks).containsExactly(
            new WeekTotal(LocalDate.of(2026, 9, 28), 30),
            new WeekTotal(LocalDate.of(2026, 10, 5), 0),
            new WeekTotal(LocalDate.of(2026, 10, 12), 45));
    }
}
