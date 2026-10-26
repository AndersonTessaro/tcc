package br.com.harmonia.application.lesson.port;

import br.com.harmonia.infrastructure.persistence.lesson.AttendanceStatus;

import java.util.UUID;

public record LessonAttendanceStatus(UUID lessonId, AttendanceStatus status) {}
