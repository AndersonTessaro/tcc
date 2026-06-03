package br.com.harmonia.domain.gamification;

import java.time.LocalDate;

/** Gamification rules (RN07). Pure — no Spring/JPA. */
public class GamificationService {
    private static final int PRACTICE_XP_CAP = 120;
    private static final int ATTENDANCE_XP = 20;

    public int xpFromPractice(int durationMin) {
        return Math.min(Math.max(durationMin, 0), PRACTICE_XP_CAP);
    }

    public int xpFromAttendance() {
        return ATTENDANCE_XP;
    }

    public int level(int xpTotal) {
        return (int) Math.floor(Math.sqrt(Math.max(xpTotal, 0) / 100.0)) + 1;
    }

    /** New streak of consecutive days with practice. */
    public int newStreak(int currentStreak, LocalDate lastPractice, LocalDate today) {
        if (lastPractice == null) return 1;
        if (lastPractice.isEqual(today)) return Math.max(currentStreak, 1);
        if (lastPractice.isEqual(today.minusDays(1))) return currentStreak + 1;
        return 1;
    }
}
