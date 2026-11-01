package br.com.harmonia.application.context;

import br.com.harmonia.application.profile.port.StudentRepository;
import br.com.harmonia.application.profile.port.TeacherRepository;
import br.com.harmonia.application.security.port.UserRepository;
import br.com.harmonia.domain.common.OwnershipException;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.infrastructure.persistence.profile.Student;
import br.com.harmonia.infrastructure.persistence.profile.Teacher;
import br.com.harmonia.infrastructure.persistence.security.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class CurrentUserServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final StudentRepository students = mock(StudentRepository.class);
    private final TeacherRepository teachers = mock(TeacherRepository.class);
    private final CurrentUserService current = new CurrentUserService(users, students, teachers);
    private final UUID school = UUID.randomUUID();

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void systemAdminBypassesSchoolAndProfileOwnership() {
        login("ADMIN", null);
        assertThat(current.isSystemAdmin()).isTrue();
        assertThat(current.canManageSchool(null)).isTrue();
        assertThat(current.assertOwnedByCurrentTeacher(enrollment(UUID.randomUUID()))).isNotNull();
        assertThat(current.assertOwnedByCurrentStudent(student(null))).isNotNull();
    }

    @Test
    void managerCanActOnlyOnOwnSchool() {
        login("MANAGER", school);
        assertThat(current.isManager()).isTrue();
        assertThat(current.currentSchoolId()).isEqualTo(school);
        assertThat(current.assertOwnedByCurrentTeacher(enrollment(school))).isNotNull();
        assertThat(current.assertOwnedByCurrentStudent(student(school))).isNotNull();
        assertThat(current.canManageSchool(UUID.randomUUID())).isFalse();
        assertThat(current.canManageSchool(null)).isFalse();
        assertThatThrownBy(() -> current.assertOwnedByCurrentTeacher(enrollment(UUID.randomUUID())))
            .isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> current.assertOwnedByCurrentStudent(student(UUID.randomUUID())))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void registrationUsesCallerSchoolUnlessCallerIsSystemAdmin() {
        login("MANAGER", school);
        assertThat(current.registrationSchoolId(UUID.randomUUID())).isEqualTo(school);
        login("TEACHER", school);
        assertThat(current.registrationSchoolId(null)).isEqualTo(school);
        login("ADMIN", null);
        assertThat(current.registrationSchoolId(school)).isEqualTo(school);
        assertThatThrownBy(() -> current.registrationSchoolId(null))
            .isInstanceOf(br.com.harmonia.lessoncore.DomainValidationException.class);
    }

    @Test
    void managerWithoutSchoolCannotManageUnassignedUsers() {
        login("MANAGER", null);
        assertThat(current.canManageSchool(null)).isFalse();
    }

    @Test
    void teacherStillNeedsOwnEnrollmentEvenWithinSameSchool() {
        User user = login("TEACHER", school);
        Teacher teacher = enrollment(school).getTeacher();
        when(teachers.findByUserId(user.getId())).thenReturn(Optional.of(teacher));
        assertThat(current.assertOwnedByCurrentTeacher(owned(teacher))).isNotNull();
        assertThatThrownBy(() -> current.assertOwnedByCurrentTeacher(enrollment(school)))
            .isInstanceOf(OwnershipException.class);
    }

    @Test
    void studentStillNeedsOwnResource() {
        User user = login("STUDENT", school);
        Student student = student(school);
        when(students.findByUserId(user.getId())).thenReturn(Optional.of(student));
        assertThat(current.assertOwnedByCurrentStudent(student)).isSameAs(student);
        assertThatThrownBy(() -> current.assertOwnedByCurrentStudent(student(school)))
            .isInstanceOf(OwnershipException.class);
    }

    private User login(String role, UUID schoolId) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setSchoolId(schoolId);
        when(users.findByUsername("caller")).thenReturn(Optional.of(user));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        Jwt jwt = Jwt.withTokenValue("token").header("alg", "RS256").subject("caller").build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
            jwt, null, List.of(new SimpleGrantedAuthority("ROLE_" + role))));
        return user;
    }

    private Student student(UUID schoolId) {
        User user = new User();
        user.setSchoolId(schoolId);
        Student student = new Student();
        student.setId(UUID.randomUUID());
        student.setUser(user);
        return student;
    }

    private Enrollment enrollment(UUID schoolId) {
        Teacher teacher = new Teacher();
        teacher.setId(UUID.randomUUID());
        teacher.setUser(student(schoolId).getUser());
        Enrollment enrollment = owned(teacher);
        enrollment.setStudent(student(schoolId));
        return enrollment;
    }

    private Enrollment owned(Teacher teacher) {
        Enrollment enrollment = new Enrollment();
        enrollment.setTeacher(teacher);
        return enrollment;
    }
}
