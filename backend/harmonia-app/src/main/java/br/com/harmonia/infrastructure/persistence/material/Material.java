package br.com.harmonia.infrastructure.persistence.material;

import br.com.harmonia.infrastructure.persistence.profile.Student;
import br.com.harmonia.infrastructure.persistence.profile.Teacher;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "material")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Material {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "teacher_id")
    private Teacher teacher;

    @ManyToOne(optional = false)
    @JoinColumn(name = "student_id")
    private Student student;

    @Column(nullable = false)
    private String title;

    private String description;

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
