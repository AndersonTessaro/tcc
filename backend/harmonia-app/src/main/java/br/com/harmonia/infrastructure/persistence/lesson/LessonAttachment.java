package br.com.harmonia.infrastructure.persistence.lesson;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "lesson_attachment")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class LessonAttachment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "lesson_id")
    private Lesson lesson;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "storage_path", nullable = false)
    private String storagePath;

    @Column(name = "content_type")
    private String contentType;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
