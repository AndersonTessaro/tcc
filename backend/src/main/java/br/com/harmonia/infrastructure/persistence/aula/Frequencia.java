package br.com.harmonia.infrastructure.persistence.aula;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "frequencia")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Frequencia {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(optional = false)
    @JoinColumn(name = "aula_id")
    private Aula aula;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FrequenciaStatus status;

    private String justificativa;

    @Column(name = "registrado_em", nullable = false)
    private LocalDateTime registradoEm = LocalDateTime.now();
}
