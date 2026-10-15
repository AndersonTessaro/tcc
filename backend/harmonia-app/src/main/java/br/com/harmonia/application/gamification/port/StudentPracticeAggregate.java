package br.com.harmonia.application.gamification.port;

import java.time.LocalDate;
import java.util.UUID;

public record StudentPracticeAggregate(UUID studentId, long sessions, long minutes, long practiceDays,
                                       Long ratingSum, long ratingCount, LocalDate lastPractice) {
    public static StudentPracticeAggregate empty(UUID studentId) {
        return new StudentPracticeAggregate(studentId, 0, 0, 0, 0L, 0, null);
    }

    public long ratingTotal() {
        return ratingSum == null ? 0 : ratingSum;
    }
}
