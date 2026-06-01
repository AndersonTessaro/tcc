package br.com.harmonia.infrastructure.persistence.gamificacao;

import br.com.harmonia.infrastructure.persistence.perfil.Aluno;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "progresso")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Progresso {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(optional = false)
    @JoinColumn(name = "aluno_id")
    private Aluno aluno;

    @Column(name = "xp_total", nullable = false)
    private Integer xpTotal = 0;

    @Column(nullable = false)
    private Integer nivel = 1;

    @Column(name = "sequencia_dias", nullable = false)
    private Integer sequenciaDias = 0;

    @Column(name = "ultima_pratica")
    private LocalDate ultimaPratica;

    @Column(name = "tempo_pratica_total_min", nullable = false)
    private Integer tempoPraticaTotalMin = 0;

    @Column(name = "atualizado_em", nullable = false)
    private LocalDateTime atualizadoEm = LocalDateTime.now();
}
