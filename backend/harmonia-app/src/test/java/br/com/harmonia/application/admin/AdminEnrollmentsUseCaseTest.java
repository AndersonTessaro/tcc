package br.com.harmonia.application.admin;

import br.com.harmonia.application.profile.port.*;
import br.com.harmonia.application.security.port.RoleRepository;
import br.com.harmonia.application.security.port.UserRepository;
import br.com.harmonia.domain.common.DuplicateResourceException;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.infrastructure.persistence.profile.*;
import br.com.harmonia.infrastructure.persistence.security.User;
import br.com.harmonia.lessoncore.DomainValidationException;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminEnrollmentsUseCaseTest {
    private final EnrollmentRepository enrollments = mock(EnrollmentRepository.class);
    private final AdminRegistrationUseCase uc = new AdminRegistrationUseCase(mock(UserRepository.class),
        mock(RoleRepository.class), mock(StudentRepository.class), mock(TeacherRepository.class),
        mock(InstrumentRepository.class), enrollments, mock(PasswordEncoder.class));

    @Test
    void listsAllStatusesOrderedByStudentDisplayName() {
        Enrollment ana = namedEnrollment("Ana", EnrollmentStatus.CLOSED);
        Enrollment bia = namedEnrollment("Bia", EnrollmentStatus.ACTIVE);
        when(enrollments.findAllBy()).thenReturn(List.of(bia, ana));
        assertThat(uc.listEnrollments(null)).containsExactly(ana, bia);
        verify(enrollments, never()).findByStatus(any());
    }

    @Test
    void filtersUsingRepositoryAndAcceptsEmptyResults() {
        when(enrollments.findByStatus(EnrollmentStatus.SUSPENDED)).thenReturn(List.of());
        assertThat(uc.listEnrollments(EnrollmentStatus.SUSPENDED)).isEmpty();
        verify(enrollments).findByStatus(EnrollmentStatus.SUSPENDED);
        verify(enrollments, never()).findAllBy();
    }

    @Test
    void missingEnrollmentIsNotFound() {
        UUID id = UUID.randomUUID();
        when(enrollments.findById(id)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> uc.setEnrollmentStatus(id, EnrollmentStatus.ACTIVE))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void duplicateReactivationIsRejected() {
        Enrollment enrollment = enrollment(EnrollmentStatus.SUSPENDED);
        when(enrollments.existsByStudentIdAndTeacherIdAndInstrumentIdAndStatus(
            enrollment.getStudent().getId(), enrollment.getTeacher().getId(), enrollment.getInstrument().getId(),
            EnrollmentStatus.ACTIVE)).thenReturn(true);
        assertThatThrownBy(() -> uc.setEnrollmentStatus(enrollment.getId(), EnrollmentStatus.ACTIVE))
            .isInstanceOf(DuplicateResourceException.class);
        assertThat(enrollment.getStatus()).isEqualTo(EnrollmentStatus.SUSPENDED);
    }

    @Test
    void activeEnrollmentCanRemainActive() {
        Enrollment enrollment = enrollment(EnrollmentStatus.ACTIVE);
        uc.setEnrollmentStatus(enrollment.getId(), EnrollmentStatus.ACTIVE);
        assertThat(enrollment.getStatus()).isEqualTo(EnrollmentStatus.ACTIVE);
        verify(enrollments, never()).existsByStudentIdAndTeacherIdAndInstrumentIdAndStatus(any(), any(), any(), any());
    }

    @Test
    void closedEnrollmentCanReactivateWhenUnique() {
        Enrollment enrollment = enrollment(EnrollmentStatus.CLOSED);
        uc.setEnrollmentStatus(enrollment.getId(), EnrollmentStatus.ACTIVE);
        assertThat(enrollment.getStatus()).isEqualTo(EnrollmentStatus.ACTIVE);
    }

    @Test
    void reactivationRejectsInactiveTeacher() {
        Enrollment enrollment = enrollment(EnrollmentStatus.SUSPENDED);
        enrollment.getTeacher().setActive(false);
        assertThatThrownBy(() -> uc.setEnrollmentStatus(enrollment.getId(), EnrollmentStatus.ACTIVE))
            .isInstanceOf(DomainValidationException.class);
        assertThat(enrollment.getStatus()).isEqualTo(EnrollmentStatus.SUSPENDED);
    }

    @Test
    void reactivationRejectsInstrumentTeacherNoLongerTeaches() {
        Enrollment enrollment = enrollment(EnrollmentStatus.CLOSED);
        enrollment.getTeacher().getInstruments().clear();
        assertThatThrownBy(() -> uc.setEnrollmentStatus(enrollment.getId(), EnrollmentStatus.ACTIVE))
            .isInstanceOf(DomainValidationException.class);
        assertThat(enrollment.getStatus()).isEqualTo(EnrollmentStatus.CLOSED);
    }

    @Test
    void activeEnrollmentCanSuspendOrClose() {
        Enrollment enrollment = enrollment(EnrollmentStatus.ACTIVE);
        uc.setEnrollmentStatus(enrollment.getId(), EnrollmentStatus.SUSPENDED);
        assertThat(enrollment.getStatus()).isEqualTo(EnrollmentStatus.SUSPENDED);
        uc.setEnrollmentStatus(enrollment.getId(), EnrollmentStatus.CLOSED);
        assertThat(enrollment.getStatus()).isEqualTo(EnrollmentStatus.CLOSED);
    }

    private Enrollment enrollment(EnrollmentStatus status) {
        Student student = new Student();
        student.setId(UUID.randomUUID());
        Teacher teacher = new Teacher();
        teacher.setId(UUID.randomUUID());
        Instrument instrument = new Instrument();
        instrument.setId(UUID.randomUUID());
        teacher.getInstruments().add(instrument);
        Enrollment enrollment = new Enrollment();
        enrollment.setId(UUID.randomUUID());
        enrollment.setStudent(student);
        enrollment.setTeacher(teacher);
        enrollment.setInstrument(instrument);
        enrollment.setStatus(status);
        when(enrollments.findById(enrollment.getId())).thenReturn(Optional.of(enrollment));
        return enrollment;
    }

    private Enrollment namedEnrollment(String name, EnrollmentStatus status) {
        Enrollment enrollment = enrollment(status);
        User user = new User();
        user.setDisplayName(name);
        enrollment.getStudent().setUser(user);
        return enrollment;
    }
}
