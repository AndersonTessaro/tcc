package br.com.harmonia.presentation.response;

import br.com.harmonia.infrastructure.persistence.lesson.Attendance;
import br.com.harmonia.infrastructure.persistence.lesson.AttendanceStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record AttendanceResponse(UUID id, UUID lessonId, AttendanceStatus status, String justification,
                                 LocalDateTime registeredAt) {
    public static AttendanceResponse of(Attendance attendance) {
        return new AttendanceResponse(attendance.getId(), attendance.getLesson().getId(), attendance.getStatus(),
            attendance.getJustification(), attendance.getRegisteredAt());
    }
}
