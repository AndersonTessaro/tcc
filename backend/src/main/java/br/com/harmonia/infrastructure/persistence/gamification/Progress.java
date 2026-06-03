package br.com.harmonia.infrastructure.persistence.gamification;

import br.com.harmonia.infrastructure.persistence.profile.Student;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "progress")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Progress {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(optional = false)
    @JoinColumn(name = "student_id")
    private Student student;

    @Column(name = "xp_total", nullable = false)
    private Integer xpTotal = 0;

    @Column(nullable = false)
    private Integer level = 1;

    @Column(name = "streak_days", nullable = false)
    private Integer streakDays = 0;

    @Column(name = "last_practice")
    private LocalDate lastPractice;

    @Column(name = "total_practice_min", nullable = false)
    private Integer totalPracticeMin = 0;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
}
