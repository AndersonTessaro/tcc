package br.com.harmonia.infrastructure.persistence.setting;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "setting")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Setting {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String key;

    @Column(nullable = false, length = 1000)
    private String value;

    private String description;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
}
