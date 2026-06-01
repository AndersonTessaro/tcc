package br.com.harmonia.infrastructure.persistence.perfil;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "instrumento")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Instrumento {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String nome;

    @Column(nullable = false)
    private Boolean ativo = true;
}
