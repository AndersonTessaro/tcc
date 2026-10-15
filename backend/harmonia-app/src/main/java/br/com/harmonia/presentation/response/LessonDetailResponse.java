package br.com.harmonia.presentation.response;

import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import br.com.harmonia.infrastructure.persistence.lesson.LessonAttachment;

import java.util.List;

public record LessonDetailResponse(LessonResponse lesson, List<AttachmentResponse> attachments) {
    public static LessonDetailResponse of(Lesson lesson, List<LessonAttachment> attachments) {
        return new LessonDetailResponse(LessonResponse.of(lesson),
            attachments.stream().map(AttachmentResponse::of).toList());
    }
}
