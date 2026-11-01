package br.com.harmonia.application.context;

import br.com.harmonia.application.profile.port.StudentRepository;
import br.com.harmonia.application.profile.port.TeacherRepository;
import br.com.harmonia.application.security.port.UserRepository;
import br.com.harmonia.domain.common.OwnershipException;
import br.com.harmonia.domain.common.ProfileRequiredException;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.lessoncore.DomainValidationException;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.infrastructure.persistence.profile.Student;
import br.com.harmonia.infrastructure.persistence.profile.Teacher;
import org.springframework.security.core.Authentication;
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

    public UUID userId() {
        Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return users.findByUsername(jwt.getSubject()).orElseThrow().getId();
    }

    public boolean isSystemAdmin() {
        return hasRole("ADMIN");
    }

    public boolean isManager() {
        return hasRole("MANAGER");
    }

    private boolean hasRole(String role) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> ("ROLE_" + role).equals(a.getAuthority()));
    }

    public UUID currentSchoolId() {
        return users.findById(userId()).orElseThrow(() -> new ResourceNotFoundException("User")).getSchoolId();
    }

    public boolean canManageSchool(UUID schoolId) {
        return isSystemAdmin() || isManager() && schoolId != null && schoolId.equals(currentSchoolId());
    }

    public void assertSchool(UUID schoolId) {
        if (!canManageSchool(schoolId)) throw new ResourceNotFoundException("Resource");
    }

    public boolean canManageStudent(UUID studentId) {
        if (isSystemAdmin()) return true;
        if (!isManager()) return false;
        assertSchool(students.findById(studentId).orElseThrow(() -> new ResourceNotFoundException("Student"))
            .getUser().getSchoolId());
        return true;
    }

    public UUID registrationSchoolId(UUID requestedSchoolId) {
        UUID schoolId = isSystemAdmin() ? requestedSchoolId : currentSchoolId();
        if (schoolId == null) throw new DomainValidationException("schoolId is required");
        return schoolId;
    }

    public Student currentStudent() {
        return students.findByUserId(userId()).orElseThrow(() -> new ProfileRequiredException("student"));
    }

    public Teacher currentTeacher() {
        return teachers.findByUserId(userId()).orElseThrow(() -> new ProfileRequiredException("teacher"));
    }

    public Enrollment assertOwnedByCurrentTeacher(Enrollment enrollment) {
        if (isSystemAdmin()) {
            return enrollment;
        }
        if (isManager()) {
            assertSchool(enrollment.getTeacher().getUser().getSchoolId());
            assertSchool(enrollment.getStudent().getUser().getSchoolId());
            return enrollment;
        }
        if (!enrollment.getTeacher().getId().equals(currentTeacher().getId()))
            throw new OwnershipException("Enrollment belongs to another teacher");
        return enrollment;
    }

    public Student assertOwnedByCurrentStudent(Student student) {
        if (isSystemAdmin()) {
            return student;
        }
        if (isManager()) {
            assertSchool(student.getUser().getSchoolId());
            return student;
        }
        if (!student.getId().equals(currentStudent().getId()))
            throw new OwnershipException("Resource belongs to another student");
        return student;
    }
}
