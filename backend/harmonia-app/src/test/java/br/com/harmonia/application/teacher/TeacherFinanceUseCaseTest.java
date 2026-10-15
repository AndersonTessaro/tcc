package br.com.harmonia.application.teacher;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.infrastructure.persistence.profile.*;
import br.com.harmonia.infrastructure.persistence.security.User;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class TeacherFinanceUseCaseTest {
    @Test
    void sumsOnlyActiveDefinedFeesAndCountsNullRatherThanZero() {
        var enrollments = mock(EnrollmentRepository.class);
        var current = mock(CurrentUserService.class);
        var teacher = new Teacher();
        teacher.setId(UUID.randomUUID());
        when(current.currentTeacher()).thenReturn(teacher);
        var closed = enrollment("Closed", "500");
        closed.setStatus(EnrollmentStatus.CLOSED);
        when(enrollments.findByTeacherId(teacher.getId())).thenReturn(List.of(
            enrollment("Caio", "0"), closed, enrollment("Bia", null), enrollment("Ana", "150.50")));
        var report = new TeacherFinanceUseCase(enrollments, current).get();
        assertThat(report.monthlyTotal()).isEqualByComparingTo("150.50");
        assertThat(report.withoutFee()).isEqualTo(1);
        assertThat(report.items()).extracting(item -> item.studentName()).containsExactly("Ana", "Bia", "Caio");
        assertThat(report.items().getFirst().classLabel()).isEqualTo("Piano");
        verify(enrollments).findByTeacherId(teacher.getId());
    }

    @Test
    void emptyPortfolioHasZeroTotalAndNoMissingFees() {
        var enrollments = mock(EnrollmentRepository.class);
        var current = mock(CurrentUserService.class);
        var teacher = new Teacher();
        teacher.setId(UUID.randomUUID());
        when(current.currentTeacher()).thenReturn(teacher);
        when(enrollments.findByTeacherId(teacher.getId())).thenReturn(List.of());
        var report = new TeacherFinanceUseCase(enrollments, current).get();
        assertThat(report.monthlyTotal()).isZero();
        assertThat(report.withoutFee()).isZero();
        assertThat(report.items()).isEmpty();
    }

    private Enrollment enrollment(String name, String fee) {
        var user = new User();
        user.setDisplayName(name);
        var student = new Student();
        student.setId(UUID.randomUUID());
        student.setUser(user);
        var instrument = new Instrument();
        instrument.setName("Piano");
        var enrollment = new Enrollment();
        enrollment.setId(UUID.randomUUID());
        enrollment.setStudent(student);
        enrollment.setInstrument(instrument);
        enrollment.setMonthlyFee(fee == null ? null : new BigDecimal(fee));
        return enrollment;
    }
}
