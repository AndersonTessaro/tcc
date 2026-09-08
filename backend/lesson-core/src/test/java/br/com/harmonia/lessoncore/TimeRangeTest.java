package br.com.harmonia.lessoncore;

import org.junit.jupiter.api.Test;

import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TimeRangeTest {

    @Test
    void endBeforeStart_throws() {
        assertThatThrownBy(() -> new TimeRange(LocalTime.of(11, 0), LocalTime.of(10, 0)))
            .isInstanceOf(DomainValidationException.class)
            .hasMessageContaining("after");
    }

    @Test
    void emptyRange_throws() {
        assertThatThrownBy(() -> new TimeRange(LocalTime.NOON, LocalTime.NOON))
            .isInstanceOf(DomainValidationException.class);
    }

    @Test
    void missingBoundary_throws() {
        assertThatThrownBy(() -> new TimeRange(null, LocalTime.NOON)).isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new TimeRange(LocalTime.NOON, null)).isInstanceOf(NullPointerException.class);
    }

    @Test
    void adjacentRangesDoNotOverlap() {
        TimeRange morning = range(9, 10);
        TimeRange next = range(10, 11);

        assertThat(morning.overlaps(next)).isFalse();
        assertThat(next.overlaps(morning)).isFalse();
    }

    @Test
    void partiallyOverlappingRangesOverlap() {
        assertThat(range(9, 11).overlaps(range(10, 12))).isTrue();
        assertThat(range(10, 12).overlaps(range(9, 11))).isTrue();
    }

    @Test
    void containedRangeOverlaps() {
        assertThat(range(9, 12).overlaps(range(10, 11))).isTrue();
        assertThat(range(10, 11).overlaps(range(9, 12))).isTrue();
    }

    @Test
    void disjointRangesDoNotOverlap() {
        assertThat(range(9, 10).overlaps(range(14, 15))).isFalse();
    }

    private TimeRange range(int startHour, int endHour) {
        return new TimeRange(LocalTime.of(startHour, 0), LocalTime.of(endHour, 0));
    }
}
