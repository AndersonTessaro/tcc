package br.com.harmonia.infrastructure.persistence.gamification;

public enum GoalType {
    PRACTICE_TIME, PRACTICE_DAYS, ATTENDANCE, STREAK, LESSONS, OTHER;

    public boolean isLegacy() {
        return this == STREAK || this == LESSONS || this == OTHER;
    }
}
