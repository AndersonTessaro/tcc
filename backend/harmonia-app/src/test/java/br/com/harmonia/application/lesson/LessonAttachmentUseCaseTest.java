package br.com.harmonia.application.lesson;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.lesson.port.LessonAttachmentRepository;
import br.com.harmonia.application.lesson.port.LessonRepository;
import br.com.harmonia.domain.common.OwnershipException;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.domain.lesson.LessonAttachmentRule;
import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import br.com.harmonia.infrastructure.persistence.lesson.LessonAttachment;
import br.com.harmonia.infrastructure.persistence.lesson.LessonStatus;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.infrastructure.storage.FileStoragePort;
import br.com.harmonia.lessoncore.DomainValidationException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LessonAttachmentUseCaseTest {
    private static final byte[] PDF = "%PDF-1.7".getBytes(StandardCharsets.US_ASCII);

    @Mock LessonRepository lessons;
    @Mock LessonAttachmentRepository attachments;
    @Mock StudentLessonUseCase studentLessons;
    @Mock CurrentUserService current;
    @Mock FileStoragePort storage;

    @BeforeEach
    void initSynchronization() {
        TransactionSynchronizationManager.initSynchronization();
    }

    @AfterEach
    void clearSynchronization() {
        TransactionSynchronizationManager.clear();
    }

    private LessonAttachmentUseCase useCase() {
        return new LessonAttachmentUseCase(lessons, attachments, studentLessons, current, storage);
    }

    private Lesson lesson(LessonStatus status) {
        Lesson lesson = new Lesson();
        lesson.setId(UUID.randomUUID());
        lesson.setEnrollment(new Enrollment());
        lesson.setStatus(status);
        when(lessons.findById(lesson.getId())).thenReturn(Optional.of(lesson));
        return lesson;
    }

    private MockMultipartFile file() {
        return new MockMultipartFile("file", "score.pdf", "application/pdf", PDF);
    }

    private LessonAttachment attachment(UUID lessonId) {
        LessonAttachment attachment = new LessonAttachment();
        attachment.setId(UUID.randomUUID());
        attachment.setStoragePath("stored_path");
        when(attachments.findByIdAndLessonId(attachment.getId(), lessonId)).thenReturn(Optional.of(attachment));
        return attachment;
    }

    private void stubSave() {
        when(storage.save(any(), any())).thenReturn("new_path");
        when(attachments.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private void complete(int status) {
        TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(status));
    }

    private void teacherOperation(String operation, UUID lessonId, UUID attachmentId) {
        switch (operation) {
            case "upload" -> useCase().upload(lessonId, file());
            case "delete" -> useCase().delete(lessonId, attachmentId);
            case "download" -> useCase().downloadAsTeacher(lessonId, attachmentId);
            default -> throw new IllegalArgumentException(operation);
        }
    }

    @Test
    void upload_invalidType_doesNotTouchStorage() {
        Lesson lesson = lesson(LessonStatus.SCHEDULED);
        var disguised = new MockMultipartFile("file", "score.pdf", "application/pdf", new byte[] {'M', 'Z', 0, 0});

        assertThatThrownBy(() -> useCase().upload(lesson.getId(), disguised))
            .isInstanceOf(DomainValidationException.class)
            .hasMessage("Attachment must be a PDF, image, audio or video file");

        verifyNoInteractions(storage);
        verify(attachments, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"upload", "delete", "download"})
    void teacherOperation_anotherTeacher_doesNotTouchStorageOrAttachments(String operation) {
        Lesson lesson = lesson(LessonStatus.SCHEDULED);
        doThrow(new OwnershipException("Enrollment belongs to another teacher"))
            .when(current).assertOwnedByCurrentTeacher(lesson.getEnrollment());

        assertThatThrownBy(() -> teacherOperation(operation, lesson.getId(), UUID.randomUUID()))
            .isInstanceOf(OwnershipException.class);

        verifyNoInteractions(storage, attachments);
    }

    @ParameterizedTest
    @ValueSource(strings = {"upload", "delete"})
    void mutation_canceledLesson_rejectsBeforeStorageOrAttachmentLookup(String operation) {
        Lesson lesson = lesson(LessonStatus.CANCELED);

        assertThatThrownBy(() -> teacherOperation(operation, lesson.getId(), UUID.randomUUID()))
            .isInstanceOf(DomainValidationException.class).hasMessage("Canceled lessons cannot be edited");

        verifyNoInteractions(storage, attachments);
    }

    @ParameterizedTest
    @EnumSource(value = LessonStatus.class, names = {"SCHEDULED", "DONE"})
    void upload_savesMetadataAndBytesAndKeepsFileOnCommit(LessonStatus status) {
        Lesson lesson = lesson(status);
        stubSave();

        LessonAttachment saved = useCase().upload(lesson.getId(), file());

        assertThat(saved.getLesson()).isSameAs(lesson);
        assertThat(saved.getFileName()).isEqualTo("score.pdf");
        assertThat(saved.getContentType()).isEqualTo("application/pdf");
        assertThat(saved.getSizeBytes()).isEqualTo((long) PDF.length);
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getStoragePath()).isEqualTo("new_path");
        verify(current).assertOwnedByCurrentTeacher(lesson.getEnrollment());
        verify(attachments).countByLessonId(lesson.getId());
        verify(storage).save("score.pdf", PDF);
        complete(TransactionSynchronization.STATUS_COMMITTED);
        verify(storage, never()).delete(any());
    }

    @Test
    void upload_eleventhAttachment_doesNotTouchStorage() {
        Lesson lesson = lesson(LessonStatus.DONE);
        when(attachments.countByLessonId(lesson.getId())).thenReturn((long) LessonAttachmentRule.MAX_PER_LESSON);

        assertThatThrownBy(() -> useCase().upload(lesson.getId(), file()))
            .isInstanceOf(DomainValidationException.class).hasMessage("Lesson already has 10 attachments");

        verifyNoInteractions(storage);
        verify(attachments, never()).save(any());
    }

    @Test
    void upload_rollback_deletesNewFile() {
        Lesson lesson = lesson(LessonStatus.DONE);
        stubSave();

        useCase().upload(lesson.getId(), file());
        verify(storage, never()).delete(any());
        complete(TransactionSynchronization.STATUS_ROLLED_BACK);

        verify(storage).delete("new_path");
    }

    @Test
    void upload_databaseFailure_deletesNewFileOnRollback() {
        Lesson lesson = lesson(LessonStatus.DONE);
        when(storage.save(any(), any())).thenReturn("new_path");
        when(attachments.save(any())).thenThrow(new IllegalStateException("Save failed"));

        assertThatThrownBy(() -> useCase().upload(lesson.getId(), file()))
            .isInstanceOf(IllegalStateException.class).hasMessage("Save failed");
        complete(TransactionSynchronization.STATUS_ROLLED_BACK);

        verify(storage).delete("new_path");
    }

    @Test
    void upload_longDisplayName_keepsTailAndExtensionWithin255Characters() {
        Lesson lesson = lesson(LessonStatus.DONE);
        stubSave();
        String original = "x".repeat(300) + ".pdf";
        var file = new MockMultipartFile("file", original, "application/pdf", PDF);

        LessonAttachment saved = useCase().upload(lesson.getId(), file);

        assertThat(saved.getFileName()).hasSize(255).isEqualTo(original.substring(original.length() - 255));
    }

    @Test
    void upload_readFailure_wrapsIOExceptionWithoutStorage() throws IOException {
        Lesson lesson = lesson(LessonStatus.SCHEDULED);
        MultipartFile file = mock(MultipartFile.class);
        when(file.getBytes()).thenThrow(new IOException("Cannot read upload"));

        assertThatThrownBy(() -> useCase().upload(lesson.getId(), file))
            .isInstanceOf(UncheckedIOException.class).hasCauseInstanceOf(IOException.class);

        verifyNoInteractions(storage, attachments);
    }

    @Test
    void delete_deletesRowAndOnlyDeletesFileAfterCommit() {
        Lesson lesson = lesson(LessonStatus.DONE);
        LessonAttachment attachment = attachment(lesson.getId());

        useCase().delete(lesson.getId(), attachment.getId());

        verify(attachments).delete(attachment);
        verifyNoInteractions(storage);
        complete(TransactionSynchronization.STATUS_COMMITTED);
        verify(storage).delete("stored_path");
    }

    @Test
    void delete_rollback_keepsFile() {
        Lesson lesson = lesson(LessonStatus.DONE);
        LessonAttachment attachment = attachment(lesson.getId());

        useCase().delete(lesson.getId(), attachment.getId());
        complete(TransactionSynchronization.STATUS_ROLLED_BACK);

        verifyNoInteractions(storage);
    }

    @Test
    void delete_storageFailureAfterCommit_doesNotFailCompletedTransaction() {
        Lesson lesson = lesson(LessonStatus.DONE);
        LessonAttachment attachment = attachment(lesson.getId());
        doThrow(new IllegalStateException("Storage unavailable")).when(storage).delete("stored_path");
        useCase().delete(lesson.getId(), attachment.getId());

        assertThatCode(() -> complete(TransactionSynchronization.STATUS_COMMITTED)).doesNotThrowAnyException();
        verify(attachments).delete(attachment);
    }

    @ParameterizedTest
    @ValueSource(strings = {"delete", "download"})
    void teacherOperation_attachmentOfAnotherLesson_returnsNotFound(String operation) {
        Lesson lesson = lesson(LessonStatus.SCHEDULED);
        UUID otherAttachmentId = UUID.randomUUID();

        assertThatThrownBy(() -> teacherOperation(operation, lesson.getId(), otherAttachmentId))
            .isInstanceOf(ResourceNotFoundException.class).hasMessage("Attachment not found");

        verify(attachments).findByIdAndLessonId(otherAttachmentId, lesson.getId());
        verify(attachments, never()).delete(any(LessonAttachment.class));
        verifyNoInteractions(storage);
    }

    @ParameterizedTest
    @ValueSource(strings = {"upload", "delete", "download"})
    void teacherOperation_missingLesson_returnsNotFound(String operation) {
        assertThatThrownBy(() -> teacherOperation(operation, UUID.randomUUID(), UUID.randomUUID()))
            .isInstanceOf(ResourceNotFoundException.class).hasMessage("Lesson not found");
        verifyNoInteractions(current, attachments, storage);
    }

    @Test
    void downloadAsTeacher_canceledLesson_readsBytesAfterOwnershipCheck() {
        Lesson lesson = lesson(LessonStatus.CANCELED);
        LessonAttachment attachment = attachment(lesson.getId());
        when(storage.read("stored_path")).thenReturn(PDF);

        assertThat(useCase().downloadAsTeacher(lesson.getId(), attachment.getId())).containsExactly(PDF);

        var order = inOrder(current, attachments, storage);
        order.verify(current).assertOwnedByCurrentTeacher(lesson.getEnrollment());
        order.verify(attachments).findByIdAndLessonId(attachment.getId(), lesson.getId());
        order.verify(storage).read("stored_path");
    }

    @Test
    void downloadAsStudent_usesDetailForOwnershipBeforeReadingBytes() {
        UUID lessonId = UUID.randomUUID();
        LessonAttachment attachment = attachment(lessonId);
        when(storage.read("stored_path")).thenReturn(PDF);

        assertThat(useCase().downloadAsStudent(lessonId, attachment.getId())).containsExactly(PDF);

        var order = inOrder(studentLessons, attachments, storage);
        order.verify(studentLessons).detail(lessonId);
        order.verify(attachments).findByIdAndLessonId(attachment.getId(), lessonId);
        order.verify(storage).read("stored_path");
        verifyNoInteractions(lessons, current);
    }

    @Test
    void downloadAsStudent_anotherStudent_doesNotTouchStorageOrAttachments() {
        UUID lessonId = UUID.randomUUID();
        when(studentLessons.detail(lessonId)).thenThrow(new OwnershipException("Resource belongs to another student"));

        assertThatThrownBy(() -> useCase().downloadAsStudent(lessonId, UUID.randomUUID()))
            .isInstanceOf(OwnershipException.class);
        verifyNoInteractions(storage, attachments, lessons, current);
    }

    @Test
    void downloadAsStudent_attachmentOfAnotherLesson_returnsNotFound() {
        UUID lessonId = UUID.randomUUID();
        UUID otherAttachmentId = UUID.randomUUID();

        assertThatThrownBy(() -> useCase().downloadAsStudent(lessonId, otherAttachmentId))
            .isInstanceOf(ResourceNotFoundException.class).hasMessage("Attachment not found");

        verify(studentLessons).detail(lessonId);
        verify(attachments).findByIdAndLessonId(otherAttachmentId, lessonId);
        verifyNoInteractions(storage);
    }
}
