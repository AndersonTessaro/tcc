package br.com.harmonia.lessoncore;

import java.util.UUID;

public record AttendanceRecordedEvent(UUID eventId, UUID lessonId, UUID studentId, AttendanceOutcome outcome,
                                      AttendanceEffect effect) {
}
