package br.com.harmonia.presentation.response;

import br.com.harmonia.infrastructure.persistence.lesson.AttendanceStatus;
import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import br.com.harmonia.infrastructure.persistence.lesson.LessonStatus;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record LessonResponse(UUID id, UUID enrollmentId, UUID studentId, String studentName, String teacherName,
                             String instrument, LocalDate date, LocalTime startTime, LocalTime endTime,
                             LessonStatus status, String content, String homework, String notes,
                             AttendanceStatus attendance) {
    public static LessonResponse of(Lesson lesson) {
        return of(lesson, null);
    }

    public static LessonResponse of(Lesson lesson, AttendanceStatus attendance) {
        Enrollment e = lesson.getEnrollment();
        return new LessonResponse(lesson.getId(), e.getId(), e.getStudent().getId(),
            e.getStudent().getUser().nameForDisplay(), e.getTeacher().getUser().nameForDisplay(),
            e.getInstrument().getName(), lesson.getDate(), lesson.getStartTime(), lesson.getEndTime(),
            lesson.getStatus(), lesson.getContent(), lesson.getHomework(), lesson.getNotes(), attendance);
    }
}
