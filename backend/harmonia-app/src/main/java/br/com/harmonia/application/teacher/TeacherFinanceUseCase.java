package br.com.harmonia.application.teacher;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.infrastructure.persistence.profile.EnrollmentStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class TeacherFinanceUseCase {
    private final EnrollmentRepository enrollments;
    private final CurrentUserService current;

    public record Item(UUID enrollmentId, UUID studentId, String studentName, String classLabel, BigDecimal monthlyFee) {}
    public record TeacherFinance(BigDecimal monthlyTotal, long withoutFee, List<Item> items) {}

    public TeacherFinanceUseCase(EnrollmentRepository enrollments, CurrentUserService current) {
        this.enrollments = enrollments;
        this.current = current;
    }

    public TeacherFinance get() {
        var items = enrollments.findByTeacherId(current.currentTeacher().getId()).stream()
            .filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE)
            .map(e -> new Item(e.getId(), e.getStudent().getId(),
                e.getStudent().getUser().nameForDisplay(), e.classLabel(), e.getMonthlyFee()))
            .sorted(Comparator.comparing(Item::studentName).thenComparing(Item::enrollmentId)).toList();
        var total = items.stream().map(Item::monthlyFee).filter(Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        long withoutFee = items.stream().filter(item -> item.monthlyFee() == null).count();
        return new TeacherFinance(total, withoutFee, items);
    }
}
