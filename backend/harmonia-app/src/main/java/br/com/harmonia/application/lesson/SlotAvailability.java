package br.com.harmonia.application.lesson;

import br.com.harmonia.lessoncore.SessionStatus;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public record SlotAvailability(SessionStatus initialStatus, List<Block> busy, List<Block> conflicts,
                               Block fulfilledSchedule) {

    public enum Kind { LESSON, RECURRING }

    public enum Party { TEACHER, STUDENT, BOTH }

    public record Block(UUID referenceId, Kind kind, Party party, LocalTime startTime, LocalTime endTime,
                        String description) {}

    public boolean available() {
        return conflicts.isEmpty();
    }
}
