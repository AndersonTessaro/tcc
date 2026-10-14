package br.com.harmonia.application.teacher;

import br.com.harmonia.application.admin.AdminRegistrationUseCase;
import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.application.profile.port.StudentRepository;
import br.com.harmonia.application.profile.port.TeacherRepository;
import br.com.harmonia.application.profile.port.TeacherStudentNoteRepository;
import br.com.harmonia.application.teacher.TeacherStudentUseCase.NewStudentCommand;
import br.com.harmonia.domain.common.OwnershipException;
import br.com.harmonia.infrastructure.persistence.profile.*;
import br.com.harmonia.infrastructure.persistence.security.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TeacherStudentUseCaseTest {
    @Mock AdminRegistrationUseCase registration;
    @Mock StudentRepository students;
    @Mock TeacherRepository teachers;
    @Mock TeacherStudentNoteRepository notes;
    @Mock CurrentUserService current;
    @Mock StudentLinkGuard links;
    @Mock EnrollmentRepository enrollments;

    private final UUID studentId = UUID.randomUUID();
    private final UUID teacherId = UUID.randomUUID();
    private final UUID instrumentId = UUID.randomUUID();

    private TeacherStudentUseCase useCase() {
        return new TeacherStudentUseCase(registration, students, teachers, notes, current, links);
    }

    private Teacher teacher() {
        Teacher teacher = new Teacher();
        teacher.setId(teacherId);
        return teacher;
    }

    private Student student() {
        User user = new User();
        user.setDisplayName("Original Name");
        user.setUsername("student");
        user.setEmail("student@h.local");
        Student student = new Student();
        student.setId(studentId);
        student.setUser(user);
        student.setPhone("12345678");
        return student;
    }

    private NewStudentCommand command(String privateNotes, String sharedNotes) {
        return new NewStudentCommand(" student ", " student@h.local ", " Initial@123 ", " Student Name ",
            " 12345678 ", instrumentId, privateNotes, sharedNotes);
    }

    private void stubRegistration() {
        when(current.currentTeacher()).thenReturn(teacher());
        when(registration.createStudent("student", "student@h.local", " Initial@123 ", "Student Name", "12345678"))
            .thenReturn(studentId);
    }

    @Test
    void register_createsStudentThenEnrollmentWithCurrentTeacher() {
        stubRegistration();

        assertThat(useCase().register(command(null, null))).isEqualTo(studentId);

        var order = inOrder(registration);
        order.verify(registration).createStudent("student", "student@h.local", " Initial@123 ", "Student Name", "12345678");
        order.verify(registration).createEnrollment(studentId, teacherId, instrumentId);
        verifyNoInteractions(notes);
    }

    @Test
    void register_blankNotesDoNotCreateRow() {
        stubRegistration();

        useCase().register(command(" ", "\t\n"));

        verifyNoInteractions(notes);
    }

    @Test
    void register_savesTrimmedNotesForCurrentPair() {
        stubRegistration();
        when(students.findById(studentId)).thenReturn(Optional.of(student()));
        when(notes.save(any())).thenAnswer(inv -> inv.getArgument(0));

        useCase().register(command(" Private ", " Shared "));

        var captor = ArgumentCaptor.forClass(TeacherStudentNote.class);
        verify(notes).save(captor.capture());
        assertThat(captor.getValue().getTeacher().getId()).isEqualTo(teacherId);
        assertThat(captor.getValue().getStudent().getId()).isEqualTo(studentId);
        assertThat(captor.getValue().getPrivateNotes()).isEqualTo("Private");
        assertThat(captor.getValue().getSharedNotes()).isEqualTo("Shared");
        assertThat(captor.getValue().getUpdatedAt()).isNotNull();
    }

    @Test
    void register_enrollmentFailureDoesNotWriteNotes() {
        stubRegistration();
        doThrow(new OwnershipException("Denied")).when(registration)
            .createEnrollment(studentId, teacherId, instrumentId);

        assertThatThrownBy(() -> useCase().register(command("Private", "Shared")))
            .isInstanceOf(OwnershipException.class);

        verifyNoInteractions(students, notes);
    }

    @Test
    void update_withoutActiveLink_doesNotLoadOrSaveStudentOrNotes() {
        when(current.currentTeacher()).thenReturn(teacher());
        doThrow(new OwnershipException("Student not linked")).when(links).assertActivelyLinked(studentId);

        assertThatThrownBy(() -> useCase().update(studentId, "Changed", null, "Private", "Shared"))
            .isInstanceOf(OwnershipException.class);

        verifyNoInteractions(students, notes);
    }

    @Test
    void update_blankNotesDeleteExistingRowAndNullPhoneClearsIt() {
        Student student = student();
        TeacherStudentNote note = new TeacherStudentNote();
        when(current.currentTeacher()).thenReturn(teacher());
        when(students.findById(studentId)).thenReturn(Optional.of(student));
        when(notes.findByTeacherIdAndStudentId(teacherId, studentId)).thenReturn(Optional.of(note));

        var profile = useCase().update(studentId, " Changed ", null, " ", "\n");

        verify(links).assertActivelyLinked(studentId);
        verify(notes).delete(note);
        verify(notes, never()).save(any());
        assertThat(profile.name()).isEqualTo("Changed");
        assertThat(student.getUser().getDisplayName()).isEqualTo("Changed");
        assertThat(student.getPhone()).isNull();
        assertThat(profile.phone()).isNull();
        assertThat(profile.privateNotes()).isNull();
        assertThat(profile.sharedNotes()).isNull();
        assertThat(profile.username()).isEqualTo("student");
        assertThat(profile.email()).isEqualTo("student@h.local");
    }

    @Test
    void update_oneNonBlankNoteKeepsRowAndRefreshesTimestamp() {
        TeacherStudentNote note = new TeacherStudentNote();
        note.setPrivateNotes("Old private");
        note.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC).minusDays(1));
        LocalDateTime previous = note.getUpdatedAt();
        when(current.currentTeacher()).thenReturn(teacher());
        when(students.findById(studentId)).thenReturn(Optional.of(student()));
        when(notes.findByTeacherIdAndStudentId(teacherId, studentId)).thenReturn(Optional.of(note));
        when(notes.save(note)).thenReturn(note);

        var profile = useCase().update(studentId, " Name ", " 87654321 ", " ", " New shared ");

        assertThat(profile.name()).isEqualTo("Name");
        assertThat(profile.phone()).isEqualTo("87654321");
        assertThat(profile.privateNotes()).isNull();
        assertThat(profile.sharedNotes()).isEqualTo("New shared");
        assertThat(note.getUpdatedAt()).isAfter(previous);
        verify(notes, never()).delete(any());
    }

    @Test
    void profile_adminGetsNullNotesWithoutTeacherProfile() {
        when(current.isAdmin()).thenReturn(true);
        when(students.findById(studentId)).thenReturn(Optional.of(student()));

        var profile = useCase().profile(studentId);

        verify(links).assertLinked(studentId);
        verify(current, never()).currentTeacher();
        verifyNoInteractions(notes);
        assertThat(profile.privateNotes()).isNull();
        assertThat(profile.sharedNotes()).isNull();
    }

    @Test
    void profile_readsOnlyCurrentTeachersNotes() {
        TeacherStudentNote note = new TeacherStudentNote();
        note.setPrivateNotes("Private");
        note.setSharedNotes("Shared");
        when(current.currentTeacher()).thenReturn(teacher());
        when(students.findById(studentId)).thenReturn(Optional.of(student()));
        when(notes.findByTeacherIdAndStudentId(teacherId, studentId)).thenReturn(Optional.of(note));

        var profile = useCase().profile(studentId);

        assertThat(profile.privateNotes()).isEqualTo("Private");
        assertThat(profile.sharedNotes()).isEqualTo("Shared");
    }

    @Test
    void myInstruments_filtersInactiveAndSortsByName() {
        Instrument active = new Instrument();
        active.setName("Guitar");
        Instrument inactive = new Instrument();
        inactive.setName("Piano");
        inactive.setActive(false);
        Teacher teacher = teacher();
        teacher.setInstruments(new LinkedHashSet<>(List.of(inactive, active)));
        when(current.currentTeacher()).thenReturn(teacher);
        when(teachers.findWithInstrumentsById(teacherId)).thenReturn(Optional.of(teacher));

        assertThat(useCase().myInstruments()).containsExactly(active);
    }

    @Test
    void linkGuard_inactiveEnrollmentAllowsReadButDeniesWriteEvenForAdmin() {
        Enrollment enrollment = new Enrollment();
        enrollment.setStatus(EnrollmentStatus.SUSPENDED);
        when(current.currentTeacher()).thenReturn(teacher());
        when(enrollments.findByTeacherIdAndStudentId(teacherId, studentId)).thenReturn(List.of(enrollment));
        var guard = new StudentLinkGuard(enrollments, current);

        guard.assertLinked(studentId);
        assertThatThrownBy(() -> guard.assertActivelyLinked(studentId)).isInstanceOf(OwnershipException.class);
        when(current.isAdmin()).thenReturn(true);
        guard.assertLinked(studentId);
        assertThatThrownBy(() -> guard.assertActivelyLinked(studentId)).isInstanceOf(OwnershipException.class);
    }
}
