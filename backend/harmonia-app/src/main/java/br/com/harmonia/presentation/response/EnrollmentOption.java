package br.com.harmonia.presentation.response;

import br.com.harmonia.infrastructure.persistence.profile.Enrollment;

import java.util.UUID;

public record EnrollmentOption(UUID id, UUID studentId, String studentName, String instrument, String classLabel) {
    public static EnrollmentOption of(Enrollment enrollment) {
        return new EnrollmentOption(enrollment.getId(), enrollment.getStudent().getId(),
            enrollment.getStudent().getUser().nameForDisplay(), enrollment.getInstrument().getName(), enrollment.classLabel());
    }
}
