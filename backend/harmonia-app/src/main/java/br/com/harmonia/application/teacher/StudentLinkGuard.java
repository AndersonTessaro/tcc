package br.com.harmonia.application.teacher;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.domain.common.OwnershipException;
import br.com.harmonia.infrastructure.persistence.profile.EnrollmentStatus;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class StudentLinkGuard {
    private final EnrollmentRepository enrollments;
    private final CurrentUserService current;

    public StudentLinkGuard(EnrollmentRepository enrollments, CurrentUserService current) {
        this.enrollments = enrollments;
        this.current = current;
    }

    public void assertLinked(UUID studentId) {
        if (!current.isAdmin()
                && enrollments.findByTeacherIdAndStudentId(current.currentTeacher().getId(), studentId).isEmpty())
            throw new OwnershipException("Student not linked");
    }

    public void assertActivelyLinked(UUID studentId) {
        if (enrollments.findByTeacherIdAndStudentId(current.currentTeacher().getId(), studentId).stream()
                .noneMatch(e -> e.getStatus() == EnrollmentStatus.ACTIVE))
            throw new OwnershipException("Student not linked");
    }
}
