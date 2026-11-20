package br.com.harmonia.presentation.response;

import br.com.harmonia.infrastructure.persistence.finance.FinancialTransaction;
import br.com.harmonia.infrastructure.persistence.finance.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record TransactionResponse(UUID id, UUID schoolId, TransactionType type, BigDecimal amount, String description,
                                  String category, LocalDate date, PersonSummary student) {
    public static TransactionResponse of(FinancialTransaction t) {
        return new TransactionResponse(t.getId(), t.getSchoolId(), t.getType(), t.getAmount(), t.getDescription(),
            t.getCategory(), t.getDate(), t.getStudent() == null ? null : PersonSummary.of(t.getStudent()));
    }
}
