package br.com.harmonia.infrastructure.persistence.security;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "auth_permission")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Permission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false)
    private String description;
}
