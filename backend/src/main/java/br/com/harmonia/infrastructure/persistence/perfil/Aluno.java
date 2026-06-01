package br.com.harmonia.infrastructure.persistence.perfil;

import br.com.harmonia.infrastructure.persistence.security.Usuario;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "aluno")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Aluno {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(optional = false)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(name = "data_nascimento")
    private LocalDate dataNascimento;

    private String telefone;

    @Column(nullable = false)
    private Boolean ativo = true;
}
