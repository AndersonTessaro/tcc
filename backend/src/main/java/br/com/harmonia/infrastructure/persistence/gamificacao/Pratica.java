package br.com.harmonia.infrastructure.persistence.gamificacao;

import br.com.harmonia.infrastructure.persistence.perfil.Aluno;
import br.com.harmonia.infrastructure.persistence.perfil.Instrumento;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "pratica")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Pratica {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "aluno_id")
    private Aluno aluno;

    @ManyToOne
    @JoinColumn(name = "instrumento_id")
    private Instrumento instrumento;

    @Column(nullable = false)
    private LocalDate data;

    @Column(name = "duracao_min", nullable = false)
    private Integer duracaoMin;

    private String observacao;

    @Column(name = "xp_ganho", nullable = false)
    private Integer xpGanho = 0;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm = LocalDateTime.now();
}
