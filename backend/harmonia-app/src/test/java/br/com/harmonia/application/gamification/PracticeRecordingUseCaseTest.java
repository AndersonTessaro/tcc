package br.com.harmonia.application.gamification;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.gamification.port.PracticeRepository;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.domain.common.OwnershipException;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.infrastructure.persistence.gamification.Practice;
import br.com.harmonia.infrastructure.persistence.gamification.PracticeRecording;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.infrastructure.persistence.profile.Student;
import br.com.harmonia.infrastructure.persistence.profile.Teacher;
import br.com.harmonia.infrastructure.storage.FileStoragePort;
import br.com.harmonia.lessoncore.DomainValidationException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PracticeRecordingUseCaseTest {

    @Mock PracticeRepository practices;
    @Mock EnrollmentRepository enrollments;
    @Mock FileStoragePort storage;
    @Mock CurrentUserService current;

    @BeforeEach
    void initSynchronization() {
        TransactionSynchronizationManager.initSynchronization();
    }

    @AfterEach
    void clearSynchronization() {
        TransactionSynchronizationManager.clear();
    }

    private PracticeRecordingUseCase useCase() {
        return new PracticeRecordingUseCase(practices, enrollments, storage, current);
    }

    private Practice practice() {
        Student student = new Student();
        student.setId(UUID.randomUUID());
        Practice practice = new Practice();
        practice.setId(UUID.randomUUID());
        practice.setStudent(student);
        when(practices.findById(practice.getId())).thenReturn(Optional.of(practice));
        return practice;
    }

    private MockMultipartFile file() {
        return new MockMultipartFile("file", "practice.mp4", "video/mp4", new byte[] {0, 0, 0, 0x18, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm'});
    }

    private void stubSave() {
        when(storage.save("practice.mp4", new byte[] {0, 0, 0, 0x18, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm'})).thenReturn("new_path");
        when(practices.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private void complete(int status) {
        TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(status));
    }

    private void recording(Practice practice) {
        practice.setRecording(new PracticeRecording("old.mp3", "old_path", "audio/mpeg", 1L,
            LocalDateTime.now()));
    }

    @Test
    void attach_missingPractice_throwsNotFound() {
        assertThatThrownBy(() -> useCase().attach(UUID.randomUUID(), file()))
            .isInstanceOf(ResourceNotFoundException.class).hasMessage("Practice not found");
        verifyNoInteractions(current, storage);
    }

    @Test
    void attach_otherStudent_throwsOwnershipWithoutStorage() {
        Practice practice = practice();
        doThrow(new OwnershipException("Resource belongs to another student"))
            .when(current).assertOwnedByCurrentStudent(practice.getStudent());

        assertThatThrownBy(() -> useCase().attach(practice.getId(), file()))
            .isInstanceOf(OwnershipException.class);
        verifyNoInteractions(storage);
        verify(practices, never()).save(any());
    }

    @Test
    void attach_invalidType_doesNotSave() {
        Practice practice = practice();
        var file = new MockMultipartFile("file", "a.pdf", "application/pdf", new byte[] {1});

        assertThatThrownBy(() -> useCase().attach(practice.getId(), file))
            .isInstanceOf(DomainValidationException.class);
        verifyNoInteractions(storage);
        verify(practices, never()).save(any());
    }

    @Test
    void attach_ownedPractice_savesMetadataAndBytes() {
        Practice practice = practice();
        stubSave();

        Practice saved = useCase().attach(practice.getId(), file());

        assertThat(saved).isSameAs(practice);
        assertThat(saved.getRecording().getFileName()).isEqualTo("practice.mp4");
        assertThat(saved.getRecording().getStoragePath()).isEqualTo("new_path");
        assertThat(saved.getRecording().getContentType()).isEqualTo("video/mp4");
        assertThat(saved.getRecording().getSizeBytes()).isEqualTo(12L);
        assertThat(saved.getRecording().getUploadedAt()).isNotNull();
        verify(current).assertOwnedByCurrentStudent(practice.getStudent());
        verify(storage).save("practice.mp4", new byte[] {0, 0, 0, 0x18, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm'});
        verify(practices).save(practice);
        complete(TransactionSynchronization.STATUS_COMMITTED);
        verify(storage, never()).delete(any());
    }

    @Test
    void attach_replacementCommit_deletesOldOnlyAfterCommit() {
        Practice practice = practice();
        recording(practice);
        stubSave();

        useCase().attach(practice.getId(), file());

        verify(storage, never()).delete(any());
        complete(TransactionSynchronization.STATUS_COMMITTED);
        verify(storage).delete("old_path");
        verify(storage, never()).delete("new_path");
    }

    @Test
    void attach_replacementRollback_deletesNewAndKeepsOld() {
        Practice practice = practice();
        recording(practice);
        stubSave();

        useCase().attach(practice.getId(), file());
        complete(TransactionSynchronization.STATUS_ROLLED_BACK);

        verify(storage).delete("new_path");
        verify(storage, never()).delete("old_path");
    }

    @Test
    void attach_saveFailureRollback_deletesNewAndKeepsOld() {
        Practice practice = practice();
        recording(practice);
        when(storage.save(any(), any())).thenReturn("new_path");
        when(practices.save(any())).thenThrow(new IllegalStateException("Save failed"));

        assertThatThrownBy(() -> useCase().attach(practice.getId(), file()))
            .isInstanceOf(IllegalStateException.class).hasMessage("Save failed");
        complete(TransactionSynchronization.STATUS_ROLLED_BACK);

        verify(storage).delete("new_path");
        verify(storage, never()).delete("old_path");
    }

    @Test
    void attach_readFailure_wrapsIOExceptionWithoutStorage() throws Exception {
        Practice practice = practice();
        var file = mock(org.springframework.web.multipart.MultipartFile.class);
        when(file.getBytes()).thenThrow(new IOException("Cannot read upload"));

        assertThatThrownBy(() -> useCase().attach(practice.getId(), file))
            .isInstanceOf(UncheckedIOException.class).hasCauseInstanceOf(IOException.class);
        verifyNoInteractions(storage);
    }

    @Test
    void downloadMine_withoutRecording_throwsNotFound() {
        Practice practice = practice();

        assertThatThrownBy(() -> useCase().downloadMine(practice.getId()))
            .isInstanceOf(ResourceNotFoundException.class).hasMessage("Recording not found");
        verify(current).assertOwnedByCurrentStudent(practice.getStudent());
        verifyNoInteractions(storage);
    }

    @Test
    void downloadMine_otherStudent_doesNotReadStorage() {
        Practice practice = practice();
        recording(practice);
        doThrow(new OwnershipException("Resource belongs to another student"))
            .when(current).assertOwnedByCurrentStudent(practice.getStudent());

        assertThatThrownBy(() -> useCase().downloadMine(practice.getId()))
            .isInstanceOf(OwnershipException.class);
        verifyNoInteractions(storage);
    }

    @Test
    void downloadMine_ownedPractice_readsBytes() {
        Practice practice = practice();
        recording(practice);
        when(storage.read("old_path")).thenReturn(new byte[] {4, 5});

        assertThat(useCase().downloadMine(practice.getId())).containsExactly((byte) 4, (byte) 5);
        verify(current).assertOwnedByCurrentStudent(practice.getStudent());
    }

    @Test
    void downloadAsTeacher_unlinked_throwsOwnershipWithoutStorage() {
        Practice practice = practice();
        Teacher teacher = new Teacher();
        teacher.setId(UUID.randomUUID());
        when(current.currentTeacher()).thenReturn(teacher);
        when(enrollments.findByTeacherIdAndStudentId(teacher.getId(), practice.getStudent().getId()))
            .thenReturn(List.of());

        assertThatThrownBy(() -> useCase().downloadAsTeacher(practice.getId()))
            .isInstanceOf(OwnershipException.class).hasMessage("Student is not linked to this teacher");
        verifyNoInteractions(storage);
    }

    @Test
    void downloadAsTeacher_linked_readsBytes() {
        Practice practice = practice();
        recording(practice);
        Teacher teacher = new Teacher();
        teacher.setId(UUID.randomUUID());
        when(current.currentTeacher()).thenReturn(teacher);
        when(enrollments.findByTeacherIdAndStudentId(teacher.getId(), practice.getStudent().getId()))
            .thenReturn(List.of(new Enrollment()));
        when(storage.read("old_path")).thenReturn(new byte[] {4});

        assertThat(useCase().downloadAsTeacher(practice.getId())).containsExactly((byte) 4);
    }

    @Test
    void downloadAsTeacher_admin_bypassesTeacherProfileAndEnrollment() {
        Practice practice = practice();
        recording(practice);
        when(current.isAdmin()).thenReturn(true);
        when(storage.read("old_path")).thenReturn(new byte[] {4});

        assertThat(useCase().downloadAsTeacher(practice.getId())).containsExactly((byte) 4);
        verify(current, never()).currentTeacher();
        verifyNoInteractions(enrollments);
    }
}
