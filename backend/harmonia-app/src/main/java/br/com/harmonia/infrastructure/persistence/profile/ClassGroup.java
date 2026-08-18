package br.com.harmonia.infrastructure.persistence.profile;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "class_group")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ClassGroup {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(optional = false)
    @JoinColumn(name = "teacher_id")
    private Teacher teacher;

    @ManyToOne
    @JoinColumn(name = "instrument_id")
    private Instrument instrument;

    @Column(nullable = false)
    private Boolean active = true;
}
