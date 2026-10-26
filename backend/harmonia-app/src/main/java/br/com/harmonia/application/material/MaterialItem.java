package br.com.harmonia.application.material;

import br.com.harmonia.infrastructure.persistence.lesson.LessonAttachment;
import br.com.harmonia.infrastructure.persistence.material.Material;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record MaterialItem(UUID id, UUID studentId, String teacherName, String title, String description,
                           String fileName, String contentType, Long sizeBytes, LocalDateTime createdAt,
                           String source, UUID lessonId, LocalDate lessonDate) {
    public static MaterialItem of(Material material) {
        return new MaterialItem(material.getId(), material.getStudent().getId(),
            material.getTeacher().getUser().nameForDisplay(), material.getTitle(), material.getDescription(),
            material.getFileName(), material.getContentType(), material.getSizeBytes(), material.getCreatedAt(),
            "MATERIAL", null, null);
    }

    public static MaterialItem of(LessonAttachment attachment) {
        var lesson = attachment.getLesson();
        var enrollment = lesson.getEnrollment();
        return new MaterialItem(attachment.getId(), enrollment.getStudent().getId(),
            enrollment.getTeacher().getUser().nameForDisplay(), attachment.getFileName(), null,
            attachment.getFileName(), attachment.getContentType(), attachment.getSizeBytes(), attachment.getCreatedAt(),
            "LESSON", lesson.getId(), lesson.getDate());
    }
}
