package br.com.harmonia.presentation.response;

import br.com.harmonia.infrastructure.persistence.material.Material;

import java.time.LocalDateTime;
import java.util.UUID;

public record MaterialResponse(UUID id, UUID studentId, String teacherName, String title, String description,
                               String fileName, String contentType, Long sizeBytes, LocalDateTime createdAt) {
    public static MaterialResponse of(Material material) {
        return new MaterialResponse(material.getId(), material.getStudent().getId(),
            material.getTeacher().getUser().nameForDisplay(), material.getTitle(), material.getDescription(),
            material.getFileName(), material.getContentType(), material.getSizeBytes(), material.getCreatedAt());
    }
}
