package br.com.harmonia.application.material;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.material.port.MaterialRepository;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.application.profile.port.StudentRepository;
import br.com.harmonia.domain.common.OwnershipException;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.infrastructure.persistence.profile.Student;
import br.com.harmonia.infrastructure.persistence.profile.Teacher;
import br.com.harmonia.infrastructure.storage.FileStoragePort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TeacherMaterialUseCaseTest {

    @Mock MaterialRepository materials;
    @Mock StudentRepository students;
    @Mock EnrollmentRepository enrollments;
    @Mock FileStoragePort storage;
    @Mock CurrentUserService current;

    private TeacherMaterialUseCase useCase() {
        return new TeacherMaterialUseCase(materials, students, enrollments, storage, current);
    }

    @Test
    void attach_studentNotLinkedToTeacher_throwsOwnershipException() {
        UUID teacherId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        Teacher teacher = new Teacher();
        teacher.setId(teacherId);
        Student student = new Student();
        student.setId(studentId);

        when(current.currentTeacher()).thenReturn(teacher);
        when(students.findById(studentId)).thenReturn(Optional.of(student));
        when(enrollments.findByTeacherIdAndStudentId(teacherId, studentId)).thenReturn(List.of());

        var file = new MockMultipartFile("file", "a.pdf", "application/pdf", new byte[] {1});

        assertThatThrownBy(() -> useCase().attach(studentId, "Title", null, file))
            .isInstanceOf(OwnershipException.class);

        verifyNoInteractions(materials, storage);
    }

    @Test
    void attach_studentLinkedToTeacher_saves() throws Exception {
        UUID teacherId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        Teacher teacher = new Teacher();
        teacher.setId(teacherId);
        Student student = new Student();
        student.setId(studentId);
        Enrollment enrollment = new Enrollment();
        enrollment.setTeacher(teacher);
        enrollment.setStudent(student);

        when(current.currentTeacher()).thenReturn(teacher);
        when(students.findById(studentId)).thenReturn(Optional.of(student));
        when(enrollments.findByTeacherIdAndStudentId(teacherId, studentId)).thenReturn(List.of(enrollment));
        when(storage.save(any(), any())).thenReturn("path/a.pdf");
        when(materials.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var file = new MockMultipartFile("file", "a.pdf", "application/pdf", new byte[] {1});

        var saved = useCase().attach(studentId, "Title", "Desc", file);

        assertThat(saved.getStudent().getId()).isEqualTo(studentId);
        assertThat(saved.getTeacher().getId()).isEqualTo(teacherId);
        verify(materials).save(any());
    }
}
