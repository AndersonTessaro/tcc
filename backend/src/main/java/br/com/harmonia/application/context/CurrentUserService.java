package br.com.harmonia.application.context;

import br.com.harmonia.application.profile.port.StudentRepository;
import br.com.harmonia.application.profile.port.TeacherRepository;
import br.com.harmonia.application.security.port.UserRepository;
import br.com.harmonia.domain.common.OwnershipException;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.infrastructure.persistence.profile.Student;
import br.com.harmonia.infrastructure.persistence.profile.Teacher;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class CurrentUserService {
    private final UserRepository users;
    private final StudentRepository students;
    private final TeacherRepository teachers;

    public CurrentUserService(UserRepository users, StudentRepository students, TeacherRepository teachers) {
        this.users = users;
        this.students = students;
        this.teachers = teachers;
    }

    private UUID userId() {
        Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return users.findByUsername(jwt.getSubject()).orElseThrow().getId();
    }

    public Student currentStudent() {
        return students.findByUserId(userId())
            .orElseThrow(() -> new IllegalStateException("User is not a student"));
    }

    public Teacher currentTeacher() {
        return teachers.findByUserId(userId())
            .orElseThrow(() -> new IllegalStateException("User is not a teacher"));
    }

    public Enrollment assertOwnedByCurrentTeacher(Enrollment enrollment) {
        if (!enrollment.getTeacher().getId().equals(currentTeacher().getId()))
            throw new OwnershipException("Enrollment belongs to another teacher");
        return enrollment;
    }

    public Student assertOwnedByCurrentStudent(Student student) {
        if (!student.getId().equals(currentStudent().getId()))
            throw new OwnershipException("Resource belongs to another student");
        return student;
    }
}
