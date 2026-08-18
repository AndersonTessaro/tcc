package br.com.harmonia.infrastructure.persistence.gamification;

import br.com.harmonia.infrastructure.persistence.profile.Student;
import br.com.harmonia.infrastructure.persistence.profile.Teacher;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "goal")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Goal {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "student_id")
    private Student student;

    @ManyToOne
    @JoinColumn(name = "created_by_teacher_id")
    private Teacher createdByTeacher;

    @Column(nullable = false)
    private String title;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GoalType type;

    @Column(nullable = false)
    private Integer target;

    @Column(name = "current_progress", nullable = false)
    private Integer currentProgress = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GoalStatus status = GoalStatus.ACTIVE;

    private LocalDate deadline;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
