package br.com.harmonia.application.teacher;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.gamification.port.ProgressRepository;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.domain.common.OwnershipException;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.infrastructure.persistence.profile.Student;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class TeacherUseCase {
    private final EnrollmentRepository enrollments;
    private final ProgressRepository progresses;
    private final CurrentUserService current;

    public TeacherUseCase(EnrollmentRepository enrollments, ProgressRepository progresses, CurrentUserService current) {
        this.enrollments = enrollments;
        this.progresses = progresses;
        this.current = current;
    }

    public List<Student> linkedStudents() {
        return enrollments.findByTeacherId(current.currentTeacher().getId()).stream()
            .map(Enrollment::getStudent).distinct().toList();
    }

    public Map<String, Object> studentDetail(UUID studentId) {
        var teacherId = current.currentTeacher().getId();
        if (enrollments.findByTeacherIdAndStudentId(teacherId, studentId).isEmpty())
            throw new OwnershipException("Student not linked");
        var progress = progresses.findByStudentId(studentId).orElse(null);
        Map<String, Object> body = new HashMap<>();
        body.put("studentId", studentId);
        body.put("progress", progress);
        return body;
    }

    public Map<String, Object> dashboard() {
        var students = linkedStudents();
        return Map.of("totalStudents", students.size(), "students", students);
    }
}
