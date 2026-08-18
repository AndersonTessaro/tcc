package br.com.harmonia.application.admin;

import br.com.harmonia.application.profile.port.*;
import br.com.harmonia.application.security.port.RoleRepository;
import br.com.harmonia.application.security.port.UserRepository;
import br.com.harmonia.infrastructure.persistence.profile.*;
import br.com.harmonia.infrastructure.persistence.security.User;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Service
public class AdminRegistrationUseCase {
    private final UserRepository users;
    private final RoleRepository roles;
    private final StudentRepository students;
    private final TeacherRepository teachers;
    private final InstrumentRepository instruments;
    private final EnrollmentRepository enrollments;
    private final PasswordEncoder encoder;

    public AdminRegistrationUseCase(UserRepository users, RoleRepository roles, StudentRepository students,
                                    TeacherRepository teachers, InstrumentRepository instruments,
                                    EnrollmentRepository enrollments, PasswordEncoder encoder) {
        this.users = users;
        this.roles = roles;
        this.students = students;
        this.teachers = teachers;
        this.instruments = instruments;
        this.enrollments = enrollments;
        this.encoder = encoder;
    }

    private User newUser(String username, String email, String password, String name, String role) {
        User u = new User();
        u.setUsername(username);
        u.setEmail(email);
        u.setDisplayName(name);
        u.setPassword(encoder.encode(password));
        u.setRoles(new LinkedHashSet<>(Set.of(roles.findByName(role).orElseThrow())));
        return users.save(u);
    }

    @Transactional
    public UUID createStudent(String username, String email, String password, String name) {
        Student s = new Student();
        s.setUser(newUser(username, email, password, name, "STUDENT"));
        return students.save(s).getId();
    }

    @Transactional
    public UUID createTeacher(String username, String email, String password, String name) {
        Teacher t = new Teacher();
        t.setUser(newUser(username, email, password, name, "TEACHER"));
        return teachers.save(t).getId();
    }

    @Transactional
    public UUID createInstrument(String name) {
        Instrument i = new Instrument();
        i.setName(name);
        return instruments.save(i).getId();
    }

    @Transactional
    public UUID createEnrollment(UUID studentId, UUID teacherId, UUID instrumentId) {
        Enrollment e = new Enrollment();
        e.setStudent(students.findById(studentId).orElseThrow());
        e.setTeacher(teachers.findById(teacherId).orElseThrow());
        e.setInstrument(instruments.findById(instrumentId).orElseThrow());
        return enrollments.save(e).getId();
    }
}
