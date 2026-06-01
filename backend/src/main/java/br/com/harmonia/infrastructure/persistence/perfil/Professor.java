package br.com.harmonia.infrastructure.persistence.perfil;

import br.com.harmonia.infrastructure.persistence.security.Usuario;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "professor")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Professor {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(optional = false)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    private String bio;

    @Column(nullable = false)
    private Boolean ativo = true;

    @JsonIgnore
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "professor_instrumento",
        joinColumns = @JoinColumn(name = "professor_id"),
        inverseJoinColumns = @JoinColumn(name = "instrumento_id"))
    private Set<Instrumento> instrumentos = new LinkedHashSet<>();
}
