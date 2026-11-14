package br.com.harmonia.lessoncore;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LessonRecurrenceTest {
    private final LocalDate first = LocalDate.of(2027, 1, 31);

    @Test
    @DisplayName("Weekly recurrence includes the first date and the inclusive end")
    void occurrences_ReturnsWeeklyDates_WhenUntilIsInclusive() {
        assertThat(LessonRecurrence.WEEKLY.occurrences(first, first.plusDays(21)))
            .containsExactly(first, first.plusDays(7), first.plusDays(14), first.plusDays(21));
    }

    @Test
    @DisplayName("Biweekly recurrence stops before an unaligned end date")
    void occurrences_ReturnsBiweeklyDates_WhenUntilIsBetweenOccurrences() {
        assertThat(LessonRecurrence.BIWEEKLY.occurrences(first, first.plusDays(30)))
            .containsExactly(first, first.plusDays(14), first.plusDays(28));
    }

    @ParameterizedTest
    @ValueSource(ints = {2027, 2028})
    @DisplayName("Monthly recurrence clamps February and returns to the original day in March")
    void occurrences_PreservesOriginalDay_WhenMonthEndsIncludingLeapYear(int year) {
        LocalDate january = LocalDate.of(year, 1, 31);
        LocalDate february = LocalDate.of(year, 2, year == 2028 ? 29 : 28);

        assertThat(LessonRecurrence.MONTHLY.occurrences(january, LocalDate.of(year, 4, 30)))
            .containsExactly(january, february, LocalDate.of(year, 3, 31), LocalDate.of(year, 4, 30));
    }

    @ParameterizedTest
    @EnumSource(LessonRecurrence.class)
    @DisplayName("The first date is included when the end equals the first date")
    void occurrences_ReturnsOneDate_WhenUntilEqualsFirst(LessonRecurrence recurrence) {
        assertThat(recurrence.occurrences(first, first)).containsExactly(first);
    }

    @Test
    @DisplayName("NONE ignores a missing, earlier or distant end date")
    void occurrences_ReturnsFirstOnly_WhenRecurrenceIsNone() {
        assertThat(LessonRecurrence.NONE.occurrences(first, null)).containsExactly(first);
        assertThat(LessonRecurrence.NONE.occurrences(first, first.minusDays(1))).containsExactly(first);
        assertThat(LessonRecurrence.NONE.occurrences(first, first.plusYears(2))).containsExactly(first);
    }

    @ParameterizedTest
    @EnumSource(value = LessonRecurrence.class, names = "NONE", mode = EnumSource.Mode.EXCLUDE)
    @DisplayName("Recurring lessons require an end date")
    void occurrences_ThrowsDomainValidation_WhenUntilIsMissing(LessonRecurrence recurrence) {
        assertThatThrownBy(() -> recurrence.occurrences(first, null))
            .isInstanceOf(DomainValidationException.class);
    }

    @ParameterizedTest
    @EnumSource(value = LessonRecurrence.class, names = "NONE", mode = EnumSource.Mode.EXCLUDE)
    @DisplayName("Recurring lessons reject an end date before the first date")
    void occurrences_ThrowsDomainValidation_WhenUntilIsBeforeFirst(LessonRecurrence recurrence) {
        assertThatThrownBy(() -> recurrence.occurrences(first, first.minusDays(1)))
            .isInstanceOf(DomainValidationException.class);
    }

    @ParameterizedTest
    @EnumSource(value = LessonRecurrence.class, names = "NONE", mode = EnumSource.Mode.EXCLUDE)
    @DisplayName("Recurring lessons reject an end date beyond twelve months")
    void occurrences_ThrowsDomainValidation_WhenUntilExceedsTwelveMonths(LessonRecurrence recurrence) {
        assertThatThrownBy(() -> recurrence.occurrences(first, first.plusMonths(12).plusDays(1)))
            .isInstanceOf(DomainValidationException.class);
    }

    @Test
    @DisplayName("The twelve-month boundary is allowed and inclusive")
    void occurrences_IncludesLastDate_WhenUntilIsExactlyTwelveMonthsLater() {
        assertThat(LessonRecurrence.MONTHLY.occurrences(first, first.plusMonths(12)))
            .hasSize(13).startsWith(first).endsWith(first.plusMonths(12));
    }

    @Test
    @DisplayName("The safety cap rejects a sixty-first occurrence")
    void occurrences_ThrowsDomainValidation_WhenSafetyCapIsExceeded() {
        assertThat(LessonRecurrence.MAX_OCCURRENCES).isEqualTo(60);
        assertThatThrownBy(() -> LessonRecurrence.WEEKLY.generateOccurrences(first, first.plusWeeks(60)))
            .isInstanceOf(DomainValidationException.class);
        assertThat(LessonRecurrence.WEEKLY.generateOccurrences(first, first.plusWeeks(59))).hasSize(60);
    }
}
