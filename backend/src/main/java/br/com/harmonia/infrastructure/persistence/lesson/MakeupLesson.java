package br.com.harmonia.infrastructure.persistence.lesson;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "makeup_lesson")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class MakeupLesson {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(optional = false)
    @JoinColumn(name = "original_lesson_id")
    private Lesson originalLesson;

    @OneToOne(optional = false)
    @JoinColumn(name = "new_lesson_id")
    private Lesson newLesson;

    private String reason;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
