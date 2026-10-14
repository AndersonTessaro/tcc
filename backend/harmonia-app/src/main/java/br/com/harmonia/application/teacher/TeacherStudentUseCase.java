package br.com.harmonia.application.teacher;

import br.com.harmonia.application.admin.AdminRegistrationUseCase;
import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.profile.port.StudentRepository;
import br.com.harmonia.application.profile.port.TeacherRepository;
import br.com.harmonia.application.profile.port.TeacherStudentNoteRepository;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.infrastructure.persistence.profile.Instrument;
import br.com.harmonia.infrastructure.persistence.profile.Student;
import br.com.harmonia.infrastructure.persistence.profile.Teacher;
import br.com.harmonia.infrastructure.persistence.profile.TeacherStudentNote;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class TeacherStudentUseCase {
    private final AdminRegistrationUseCase registration;
    private final StudentRepository students;
    private final TeacherRepository teachers;
    private final TeacherStudentNoteRepository notes;
    private final CurrentUserService current;
    private final StudentLinkGuard links;

    public TeacherStudentUseCase(AdminRegistrationUseCase registration, StudentRepository students,
                                 TeacherRepository teachers, TeacherStudentNoteRepository notes,
                                 CurrentUserService current, StudentLinkGuard links) {
        this.registration = registration;
        this.students = students;
        this.teachers = teachers;
        this.notes = notes;
        this.current = current;
        this.links = links;
    }

    public record NewStudentCommand(String username, String email, String password, String name, String phone,
                                    UUID instrumentId, String privateNotes, String sharedNotes) {}
    public record StudentProfile(UUID id, String name, String username, String email, String phone,
                                 String privateNotes, String sharedNotes) {}

    @Transactional(readOnly = true)
    public List<Instrument> myInstruments() {
        return teachers.findWithInstrumentsById(current.currentTeacher().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Teacher"))
            .getInstruments().stream().filter(Instrument::getActive)
            .sorted(Comparator.comparing(Instrument::getName)).toList();
    }

    @Transactional
    public UUID register(NewStudentCommand c) {
        Teacher teacher = current.currentTeacher();
        UUID studentId = registration.createStudent(trim(c.username()), trim(c.email()), c.password(),
            trim(c.name()), trim(c.phone()));
        registration.createEnrollment(studentId, teacher.getId(), c.instrumentId());
        String privateNotes = trim(c.privateNotes());
        String sharedNotes = trim(c.sharedNotes());
        if (privateNotes != null || sharedNotes != null) {
            saveNotes(teacher, student(studentId), privateNotes, sharedNotes);
        }
        return studentId;
    }

    @Transactional(readOnly = true)
    public StudentProfile profile(UUID studentId) {
        links.assertLinked(studentId);
        Student student = student(studentId);
        TeacherStudentNote note = current.isAdmin() ? null : notes.findByTeacherIdAndStudentId(
            current.currentTeacher().getId(), studentId).orElse(null);
        return profileOf(student, note);
    }

    @Transactional
    public StudentProfile update(UUID studentId, String name, String phone, String privateNotes, String sharedNotes) {
        Teacher teacher = current.currentTeacher();
        links.assertActivelyLinked(studentId);
        Student student = student(studentId);
        student.getUser().setDisplayName(trim(name));
        student.setPhone(trim(phone));
        TeacherStudentNote note = saveNotes(teacher, student, trim(privateNotes), trim(sharedNotes));
        return profileOf(student, note);
    }

    private Student student(UUID id) {
        return students.findById(id).orElseThrow(() -> new ResourceNotFoundException("Student"));
    }

    private TeacherStudentNote saveNotes(Teacher teacher, Student student, String privateNotes, String sharedNotes) {
        TeacherStudentNote note = notes.findByTeacherIdAndStudentId(teacher.getId(), student.getId()).orElse(null);
        if (privateNotes == null && sharedNotes == null) {
            if (note != null) notes.delete(note);
            return null;
        }
        if (note == null) {
            note = new TeacherStudentNote();
            note.setTeacher(teacher);
            note.setStudent(student);
        }
        note.setPrivateNotes(privateNotes);
        note.setSharedNotes(sharedNotes);
        note.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC));
        return notes.save(note);
    }

    private static StudentProfile profileOf(Student student, TeacherStudentNote note) {
        var user = student.getUser();
        return new StudentProfile(student.getId(), user.nameForDisplay(), user.getUsername(), user.getEmail(),
            student.getPhone(), note == null ? null : note.getPrivateNotes(), note == null ? null : note.getSharedNotes());
    }

    private static String trim(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
