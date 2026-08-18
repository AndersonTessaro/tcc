package br.com.harmonia.infrastructure.persistence.finance;

import br.com.harmonia.infrastructure.persistence.profile.Student;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "financial_transaction")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class FinancialTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionType type;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    private String description;

    private String category;

    @Column(nullable = false)
    private LocalDate date;

    @ManyToOne
    @JoinColumn(name = "student_id")
    private Student student;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
