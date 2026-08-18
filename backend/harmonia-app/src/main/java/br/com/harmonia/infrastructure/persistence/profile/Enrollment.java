package br.com.harmonia.infrastructure.persistence.profile;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "enrollment")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Enrollment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "student_id")
    private Student student;

    @ManyToOne(optional = false)
    @JoinColumn(name = "teacher_id")
    private Teacher teacher;

    @ManyToOne(optional = false)
    @JoinColumn(name = "instrument_id")
    private Instrument instrument;

    @ManyToOne
    @JoinColumn(name = "class_group_id")
    private ClassGroup classGroup;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate = LocalDate.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EnrollmentStatus status = EnrollmentStatus.ACTIVE;
}
