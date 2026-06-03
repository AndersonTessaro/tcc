package br.com.harmonia.infrastructure.persistence.profile;

import br.com.harmonia.infrastructure.persistence.security.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "teacher")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Teacher {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    private String bio;

    @Column(nullable = false)
    private Boolean active = true;

    @JsonIgnore
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "teacher_instrument",
        joinColumns = @JoinColumn(name = "teacher_id"),
        inverseJoinColumns = @JoinColumn(name = "instrument_id"))
    private Set<Instrument> instruments = new LinkedHashSet<>();
}
