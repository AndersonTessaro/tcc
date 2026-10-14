package br.com.harmonia.infrastructure.persistence.profile;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "teacher_student_note", uniqueConstraints =
    @UniqueConstraint(name = "uq_teacher_student_note", columnNames = {"teacher_id", "student_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class TeacherStudentNote {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "teacher_id")
    private Teacher teacher;

    @ManyToOne(optional = false)
    @JoinColumn(name = "student_id")
    private Student student;

    @Column(name = "private_notes", length = 1000)
    private String privateNotes;

    @Column(name = "shared_notes", length = 1000)
    private String sharedNotes;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now(ZoneOffset.UTC);
}
