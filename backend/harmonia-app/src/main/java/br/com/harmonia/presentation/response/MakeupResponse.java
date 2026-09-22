package br.com.harmonia.presentation.response;

import br.com.harmonia.infrastructure.persistence.lesson.MakeupLesson;

import java.time.LocalDateTime;
import java.util.UUID;

public record MakeupResponse(UUID id, LessonResponse originalLesson, LessonResponse newLesson, String reason,
                             LocalDateTime createdAt) {
    public static MakeupResponse of(MakeupLesson makeup) {
        return new MakeupResponse(makeup.getId(), LessonResponse.of(makeup.getOriginalLesson()),
            LessonResponse.of(makeup.getNewLesson()), makeup.getReason(), makeup.getCreatedAt());
    }
}
