package br.com.harmonia.application.material;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.lesson.port.LessonAttachmentRepository;
import br.com.harmonia.application.material.port.MaterialRepository;
import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import br.com.harmonia.infrastructure.persistence.lesson.LessonAttachment;
import br.com.harmonia.infrastructure.persistence.material.Material;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.infrastructure.persistence.profile.Student;
import br.com.harmonia.infrastructure.persistence.profile.Teacher;
import br.com.harmonia.infrastructure.persistence.security.User;
import br.com.harmonia.infrastructure.storage.FileStoragePort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudentMaterialUseCaseTest {
    @Mock MaterialRepository materials;
    @Mock FileStoragePort storage;
    @Mock CurrentUserService current;
    @Mock LessonAttachmentRepository attachments;
    @InjectMocks StudentMaterialUseCase useCase;
    private final Student student = new Student();
    private final Teacher teacher = new Teacher();

    @BeforeEach
    void setUp() {
        student.setId(UUID.randomUUID());
        User user = new User();
        user.setDisplayName("Teacher");
        teacher.setUser(user);
        when(current.currentStudent()).thenReturn(student);
    }

    private LessonAttachment attachment() {
        Enrollment enrollment = new Enrollment();
        enrollment.setStudent(student);
        enrollment.setTeacher(teacher);
        Lesson lesson = new Lesson();
        lesson.setId(UUID.randomUUID());
        lesson.setDate(LocalDate.now());
        lesson.setEnrollment(enrollment);
        LessonAttachment attachment = new LessonAttachment();
        attachment.setId(UUID.randomUUID());
        attachment.setLesson(lesson);
        attachment.setFileName("Score.PDF");
        attachment.setCreatedAt(LocalDateTime.now().minusDays(1));
        return attachment;
    }

    @Test
    void mergesMaterialsAndAttachmentsNewestFirstWithLessonMetadata() {
        Material material = new Material();
        material.setId(UUID.randomUUID());
        material.setStudent(student);
        material.setTeacher(teacher);
        material.setTitle("Exercise");
        LessonAttachment attachment = attachment();
        when(materials.findByStudentId(student.getId())).thenReturn(List.of(material));
        when(attachments.findByLessonEnrollmentStudentId(student.getId())).thenReturn(List.of(attachment));

        var items = useCase.list(null);

        assertThat(items).extracting(MaterialItem::source).containsExactly("MATERIAL", "LESSON");
        assertThat(items.get(0).lessonId()).isNull();
        assertThat(items.get(1).lessonId()).isEqualTo(attachment.getLesson().getId());
        assertThat(items.get(1).title()).isEqualTo("Score.PDF");
        assertThat(items.get(1).id()).isEqualTo(attachment.getId());
        verifyNoInteractions(storage);
    }

    @Test
    void searchesAttachmentFileNamesCaseInsensitivelyAndKeepsMaterialTitleSearch() {
        LessonAttachment attachment = attachment();
        when(attachments.findByLessonEnrollmentStudentId(student.getId())).thenReturn(List.of(attachment));

        assertThat(useCase.list("sCoRe")).extracting(MaterialItem::id).containsExactly(attachment.getId());
        assertThat(useCase.list("missing")).isEmpty();
        verify(materials).findByStudentIdAndTitleContainingIgnoreCase(student.getId(), "sCoRe");
        verify(materials).findByStudentIdAndTitleContainingIgnoreCase(student.getId(), "missing");
    }
}
