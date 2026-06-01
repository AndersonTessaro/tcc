package br.com.harmonia.infrastructure.persistence.perfil;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "turma")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Turma {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String nome;

    @ManyToOne(optional = false)
    @JoinColumn(name = "professor_id")
    private Professor professor;

    @ManyToOne
    @JoinColumn(name = "instrumento_id")
    private Instrumento instrumento;

    @Column(nullable = false)
    private Boolean ativo = true;
}
