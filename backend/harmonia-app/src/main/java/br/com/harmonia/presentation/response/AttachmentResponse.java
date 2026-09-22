package br.com.harmonia.presentation.response;

import br.com.harmonia.infrastructure.persistence.lesson.LessonAttachment;

import java.time.LocalDateTime;
import java.util.UUID;

public record AttachmentResponse(UUID id, String fileName, String contentType, Long sizeBytes,
                                 LocalDateTime createdAt) {
    public static AttachmentResponse of(LessonAttachment attachment) {
        return new AttachmentResponse(attachment.getId(), attachment.getFileName(), attachment.getContentType(),
            attachment.getSizeBytes(), attachment.getCreatedAt());
    }
}
