package br.com.harmonia.presentation.response;

import br.com.harmonia.infrastructure.persistence.material.Material;
import br.com.harmonia.application.material.MaterialItem;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record MaterialResponse(UUID id, UUID studentId, String teacherName, String title, String description,
                               String fileName, String contentType, Long sizeBytes, LocalDateTime createdAt,
                               String source, UUID lessonId, LocalDate lessonDate) {
    public static MaterialResponse of(Material material) {
        return of(MaterialItem.of(material));
    }

    public static MaterialResponse of(MaterialItem item) {
        return new MaterialResponse(item.id(), item.studentId(), item.teacherName(), item.title(), item.description(),
            item.fileName(), item.contentType(), item.sizeBytes(), item.createdAt(), item.source(), item.lessonId(), item.lessonDate());
    }
}
