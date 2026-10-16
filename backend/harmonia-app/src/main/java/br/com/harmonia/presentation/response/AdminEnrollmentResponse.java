package br.com.harmonia.presentation.response;

import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.infrastructure.persistence.profile.EnrollmentStatus;

import java.math.BigDecimal;
import java.util.UUID;

public record AdminEnrollmentResponse(UUID id, PersonSummary student, PersonSummary teacher,
                                      InstrumentOption instrument, String classLabel, EnrollmentStatus status,
                                      BigDecimal monthlyFee) {
    public static AdminEnrollmentResponse of(Enrollment enrollment) {
        return new AdminEnrollmentResponse(enrollment.getId(), PersonSummary.of(enrollment.getStudent()),
            PersonSummary.of(enrollment.getTeacher().getId(), enrollment.getTeacher().getUser()),
            InstrumentOption.of(enrollment.getInstrument()), enrollment.classLabel(), enrollment.getStatus(),
            enrollment.getMonthlyFee());
    }
}
