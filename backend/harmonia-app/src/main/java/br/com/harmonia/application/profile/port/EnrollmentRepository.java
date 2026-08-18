package br.com.harmonia.application.profile.port;

import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EnrollmentRepository extends JpaRepository<Enrollment, UUID> {
    List<Enrollment> findByTeacherId(UUID teacherId);
    List<Enrollment> findByStudentId(UUID studentId);
    List<Enrollment> findByTeacherIdAndStudentId(UUID teacherId, UUID studentId);
}
