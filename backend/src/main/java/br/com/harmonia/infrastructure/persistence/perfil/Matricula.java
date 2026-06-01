package br.com.harmonia.infrastructure.persistence.perfil;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "matricula")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Matricula {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "aluno_id")
    private Aluno aluno;

    @ManyToOne(optional = false)
    @JoinColumn(name = "professor_id")
    private Professor professor;

    @ManyToOne(optional = false)
    @JoinColumn(name = "instrumento_id")
    private Instrumento instrumento;

    @ManyToOne
    @JoinColumn(name = "turma_id")
    private Turma turma;

    @Column(name = "data_inicio", nullable = false)
    private LocalDate dataInicio = LocalDate.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MatriculaStatus status = MatriculaStatus.ATIVA;
}
