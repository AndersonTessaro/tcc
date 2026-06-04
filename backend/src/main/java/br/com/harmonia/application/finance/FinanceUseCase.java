package br.com.harmonia.application.finance;

import br.com.harmonia.application.finance.port.FinancialTransactionRepository;
import br.com.harmonia.application.profile.port.StudentRepository;
import br.com.harmonia.infrastructure.persistence.finance.FinancialTransaction;
import br.com.harmonia.infrastructure.persistence.finance.TransactionType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class FinanceUseCase {
    private final FinancialTransactionRepository transactions;
    private final StudentRepository students;

    public FinanceUseCase(FinancialTransactionRepository transactions, StudentRepository students) {
        this.transactions = transactions;
        this.students = students;
    }

    public List<FinancialTransaction> list() {
        return transactions.findAll();
    }

    public BigDecimal balance() {
        return transactions.findAll().stream()
            .map(t -> t.getType() == TransactionType.INCOME ? t.getAmount() : t.getAmount().negate())
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Transactional
    public FinancialTransaction create(TransactionType type, BigDecimal amount, String description,
                                       String category, LocalDate date, UUID studentId) {
        FinancialTransaction t = new FinancialTransaction();
        t.setType(type);
        t.setAmount(amount);
        t.setDescription(description);
        t.setCategory(category);
        t.setDate(date == null ? LocalDate.now() : date);
        if (studentId != null) t.setStudent(students.findById(studentId).orElseThrow());
        return transactions.save(t);
    }
}
