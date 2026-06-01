package br.com.harmonia.infrastructure.persistence.aula;

import br.com.harmonia.infrastructure.persistence.perfil.Matricula;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "aula")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Aula {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "matricula_id")
    private Matricula matricula;

    @Column(nullable = false)
    private LocalDate data;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "hora_fim")
    private LocalTime horaFim;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AulaStatus status = AulaStatus.AGENDADA;

    private String conteudo;

    @Column(name = "tarefa_casa")
    private String tarefaCasa;

    private String observacoes;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm = LocalDateTime.now();
}
