package br.com.harmonia.domain.gamification;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class GamificationServiceTest {
    private final GamificationService s = new GamificationService();

    @Test void xpFromPractice_capsAt120() {
        assertEquals(60, s.xpFromPractice(60));
        assertEquals(120, s.xpFromPractice(120));
        assertEquals(120, s.xpFromPractice(200));
    }

    @Test void xpFromAttendance_is20() {
        assertEquals(20, s.xpFromAttendance());
    }

    @Test void level_byBand() {
        assertEquals(1, s.level(0));
        assertEquals(1, s.level(99));
        assertEquals(2, s.level(100));
        assertEquals(3, s.level(400));
        assertEquals(4, s.level(900));
    }

    @Test void streak_incrementsWhenYesterday() {
        assertEquals(6, s.newStreak(5, LocalDate.of(2026, 5, 30), LocalDate.of(2026, 5, 31)));
    }

    @Test void streak_keepsWhenSameDay() {
        assertEquals(5, s.newStreak(5, LocalDate.of(2026, 5, 31), LocalDate.of(2026, 5, 31)));
    }

    @Test void streak_resetsWhenGap() {
        assertEquals(1, s.newStreak(5, LocalDate.of(2026, 5, 28), LocalDate.of(2026, 5, 31)));
    }

    @Test void streak_oneWhenFirstPractice() {
        assertEquals(1, s.newStreak(0, null, LocalDate.of(2026, 5, 31)));
    }
}
