package br.com.harmonia.infrastructure.persistence.gamificacao;

import br.com.harmonia.infrastructure.persistence.perfil.Aluno;
import br.com.harmonia.infrastructure.persistence.perfil.Professor;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "meta")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Meta {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "aluno_id")
    private Aluno aluno;

    @ManyToOne
    @JoinColumn(name = "criado_por_professor_id")
    private Professor criadoPor;

    @Column(nullable = false)
    private String titulo;

    private String descricao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MetaTipo tipo;

    @Column(nullable = false)
    private Integer alvo;

    @Column(name = "progresso_atual", nullable = false)
    private Integer progressoAtual = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MetaStatus status = MetaStatus.ATIVA;

    private LocalDate prazo;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm = LocalDateTime.now();

    @Column(name = "concluida_em")
    private LocalDateTime concluidaEm;
}
