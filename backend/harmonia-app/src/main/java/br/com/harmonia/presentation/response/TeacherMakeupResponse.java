package br.com.harmonia.presentation.response;

import br.com.harmonia.infrastructure.persistence.lesson.LessonStatus;
import br.com.harmonia.infrastructure.persistence.lesson.MakeupLesson;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record TeacherMakeupResponse(UUID id, String reason, Original original, Replacement makeup,
                                    String studentName, String instrument) {
    public record Original(UUID lessonId, LocalDate date, LocalTime startTime, LessonStatus status) {}
    public record Replacement(UUID lessonId, LocalDate date, LocalTime startTime, LocalTime endTime,
                              LessonStatus status) {}

    public static TeacherMakeupResponse of(MakeupLesson link) {
        var original = link.getOriginalLesson();
        var makeup = link.getNewLesson();
        var enrollment = makeup.getEnrollment();
        return new TeacherMakeupResponse(link.getId(), link.getReason(),
            new Original(original.getId(), original.getDate(), original.getStartTime(), original.getStatus()),
            new Replacement(makeup.getId(), makeup.getDate(), makeup.getStartTime(), makeup.getEndTime(), makeup.getStatus()),
            enrollment.getStudent().getUser().nameForDisplay(), enrollment.getInstrument().getName());
    }
}
