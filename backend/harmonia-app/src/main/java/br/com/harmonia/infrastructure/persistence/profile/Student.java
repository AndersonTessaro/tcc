package br.com.harmonia.infrastructure.persistence.profile;

import br.com.harmonia.infrastructure.persistence.security.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "student")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    private String phone;

    @Column(nullable = false)
    private Boolean active = true;
}
