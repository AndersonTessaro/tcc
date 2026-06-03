package br.com.harmonia.infrastructure.persistence.profile;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "instrument")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Instrument {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false)
    private Boolean active = true;
}
