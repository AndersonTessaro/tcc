package br.com.harmonia.infrastructure.persistence.gamification;

import br.com.harmonia.infrastructure.persistence.profile.Instrument;
import br.com.harmonia.infrastructure.persistence.profile.Student;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "practice")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Practice {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "student_id")
    private Student student;

    @ManyToOne
    @JoinColumn(name = "instrument_id")
    private Instrument instrument;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "duration_min", nullable = false)
    private Integer durationMin;

    private String notes;

    @Column(name = "xp_earned", nullable = false)
    private Integer xpEarned = 0;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
