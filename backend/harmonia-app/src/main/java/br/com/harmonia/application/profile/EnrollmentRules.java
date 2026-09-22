package br.com.harmonia.application.profile;

import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.infrastructure.persistence.profile.EnrollmentStatus;
import br.com.harmonia.lessoncore.DomainValidationException;

public final class EnrollmentRules {

    private EnrollmentRules() {
    }

    public static Enrollment requireActive(Enrollment enrollment) {
        if (enrollment.getStatus() != EnrollmentStatus.ACTIVE) {
            throw new DomainValidationException("Enrollment is not active");
        }
        return enrollment;
    }
}
