package br.com.harmonia.application.admin;

import br.com.harmonia.application.profile.port.*;
import br.com.harmonia.domain.common.DuplicateResourceException;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.lessoncore.DomainValidationException;
import br.com.harmonia.application.security.port.RoleRepository;
import br.com.harmonia.application.security.port.UserRepository;
import br.com.harmonia.infrastructure.persistence.profile.*;
import br.com.harmonia.infrastructure.persistence.security.User;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
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
        // Login matches username OR email, so a value may not repeat across the two columns either.
        if (users.findByUsername(username).isPresent() || users.findByEmail(username).isPresent()) {
            throw new DuplicateResourceException("Username already in use");
        }
        if (users.findByEmail(email).isPresent() || users.findByUsername(email).isPresent()) {
            throw new DuplicateResourceException("Email already in use");
        }
        User u = new User();
        u.setUsername(username);
        u.setEmail(email);
        u.setDisplayName(name);
        u.setPassword(encoder.encode(password));
        u.setRoles(new LinkedHashSet<>(Set.of(roles.findByName(role).orElseThrow())));
        return users.save(u);
    }

    @Transactional
    public UUID createStudent(String username, String email, String password, String name, String phone) {
        Student s = new Student();
        s.setUser(newUser(username, email, password, name, "STUDENT"));
        s.setPhone(phone);
        return students.save(s).getId();
    }

    @Transactional
    public UUID createTeacher(String username, String email, String password, String name,
                              Collection<UUID> instrumentIds) {
        Teacher t = new Teacher();
        t.setInstruments(activeInstrumentsById(instrumentIds));
        t.setUser(newUser(username, email, password, name, "TEACHER"));
        return teachers.save(t).getId();
    }

    @Transactional
    public Teacher setTeacherInstruments(UUID teacherId, Collection<UUID> instrumentIds) {
        Teacher teacher = teachers.findWithInstrumentsById(teacherId)
            .orElseThrow(() -> new ResourceNotFoundException("Teacher"));
        teacher.setInstruments(activeInstrumentsById(instrumentIds));
        return teachers.save(teacher);
    }

    private Set<Instrument> activeInstrumentsById(Collection<UUID> instrumentIds) {
        if (instrumentIds == null || instrumentIds.isEmpty()) {
            return new LinkedHashSet<>();
        }
        Set<UUID> ids = new LinkedHashSet<>(instrumentIds);
        List<Instrument> found = instruments.findAllById(ids);
        if (found.size() != ids.size()) {
            throw new ResourceNotFoundException("Instrument");
        }
        found.forEach(i -> requireActive(i.getActive(), "Instrument"));
        return new LinkedHashSet<>(found);
    }

    @Transactional
    public UUID createInstrument(String name) {
        Instrument i = new Instrument();
        i.setName(name);
        return instruments.save(i).getId();
    }

    @Transactional
    public UUID createEnrollment(UUID studentId, UUID teacherId, UUID instrumentId) {
        return createEnrollment(studentId, teacherId, instrumentId, null);
    }

    @Transactional
    public UUID createEnrollment(UUID studentId, UUID teacherId, UUID instrumentId, BigDecimal monthlyFee) {
        Student student = students.findById(studentId).orElseThrow(() -> new ResourceNotFoundException("Student"));
        Teacher teacher = teachers.findById(teacherId).orElseThrow(() -> new ResourceNotFoundException("Teacher"));
        Instrument instrument = instruments.findById(instrumentId)
            .orElseThrow(() -> new ResourceNotFoundException("Instrument"));
        requireActive(student.getActive(), "Student");
        requireActive(teacher.getActive(), "Teacher");
        requireActive(instrument.getActive(), "Instrument");
        if (teacher.getInstruments().stream().noneMatch(i -> i.getId().equals(instrumentId))) {
            throw new DomainValidationException("Teacher does not teach this instrument");
        }
        if (enrollments.existsByStudentIdAndTeacherIdAndInstrumentIdAndStatus(studentId, teacherId, instrumentId,
                EnrollmentStatus.ACTIVE)) {
            throw new DuplicateResourceException(
                "Student already has an active enrollment with this teacher and instrument");
        }
        Enrollment e = new Enrollment();
        e.setStudent(student);
        e.setTeacher(teacher);
        e.setInstrument(instrument);
        e.setMonthlyFee(monthlyFee);
        return enrollments.save(e).getId();
    }

    @Transactional
    public void setEnrollmentFee(UUID id, BigDecimal monthlyFee) {
        Enrollment enrollment = enrollments.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Enrollment"));
        enrollment.setMonthlyFee(monthlyFee);
    }

    private static void requireActive(boolean active, String resource) {
        if (!active) {
            throw new DomainValidationException(resource + " is not active");
        }
    }

    public List<Student> activeStudents() {
        return students.findAll().stream().filter(Student::getActive)
            .sorted(Comparator.comparing(s -> s.getUser().nameForDisplay())).toList();
    }

    public List<Teacher> activeTeachers() {
        return teachers.findByActiveTrue().stream()
            .sorted(Comparator.comparing(t -> t.getUser().nameForDisplay())).toList();
    }

    public List<Instrument> activeInstruments() {
        return instruments.findAll().stream().filter(Instrument::getActive)
            .sorted(Comparator.comparing(Instrument::getName)).toList();
    }
}
