package br.com.harmonia.application.finance;

import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.profile.port.SchoolRepository;
import br.com.harmonia.lessoncore.DomainValidationException;
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
    private final CurrentUserService current;
    private final SchoolRepository schools;

    public FinanceUseCase(FinancialTransactionRepository transactions, StudentRepository students, CurrentUserService current, SchoolRepository schools) {
        this.transactions = transactions;
        this.students = students;
        this.current = current;
        this.schools = schools;
    }

    public List<FinancialTransaction> list() {
        return transactions.findAll().stream().filter(t -> current.canManageSchool(t.getSchoolId())).toList();
    }

    public BigDecimal balance() {
        return list().stream()
            .map(t -> t.getType() == TransactionType.INCOME ? t.getAmount() : t.getAmount().negate())
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Transactional
    public FinancialTransaction create(TransactionType type, BigDecimal amount, String description,
                                       String category, LocalDate date, UUID studentId, UUID schoolId) {
        FinancialTransaction t = new FinancialTransaction();
        t.setType(type);
        t.setAmount(amount);
        t.setDescription(description);
        t.setCategory(category);
        t.setDate(date == null ? LocalDate.now() : date);
        if (studentId != null) {
            var student = students.findById(studentId).orElseThrow(() -> new ResourceNotFoundException("Student"));
            current.assertSchool(student.getUser().getSchoolId());
            t.setStudent(student);
            UUID studentSchool = student.getUser().getSchoolId();
            if (current.isSystemAdmin() && schoolId != null && !schoolId.equals(studentSchool))
                throw new DomainValidationException("Student and transaction must belong to the same school");
            schoolId = studentSchool;
        }
        UUID assignedSchool = current.registrationSchoolId(schoolId);
        var school = schools.findById(assignedSchool).orElseThrow(() -> new ResourceNotFoundException("School"));
        if (!school.isActive()) throw new DomainValidationException("School is not active");
        t.setSchoolId(assignedSchool);
        return transactions.save(t);
    }
}
