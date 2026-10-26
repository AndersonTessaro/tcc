package br.com.harmonia.application.account;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.application.profile.port.StudentRepository;
import br.com.harmonia.application.profile.port.TeacherRepository;
import br.com.harmonia.application.security.port.UserRepository;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.infrastructure.persistence.security.User;
import br.com.harmonia.infrastructure.storage.FileStoragePort;
import br.com.harmonia.lessoncore.DomainValidationException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AvatarUseCaseTest {
    @Mock CurrentUserService current;
    @Mock UserRepository users;
    @Mock StudentRepository students;
    @Mock TeacherRepository teachers;
    @Mock EnrollmentRepository enrollments;
    @Mock FileStoragePort storage;
    @InjectMocks AvatarUseCase avatars;
    private final byte[] png = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};

    @BeforeEach
    void begin() {
        TransactionSynchronizationManager.initSynchronization();
    }

    @AfterEach
    void clear() {
        TransactionSynchronizationManager.clear();
    }

    private User user(String path) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setAvatarPath(path);
        when(current.userId()).thenReturn(user.getId());
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        return user;
    }

    private void complete(int status) {
        TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCompletion(status));
    }

    @Test
    void replacementDeletesOldFileOnlyAfterCommit() {
        User user = user("old");
        when(storage.save("avatar.png", png)).thenReturn("new");

        avatars.upload(new MockMultipartFile("file", "untrusted.exe", "text/plain", png));

        assertThat(user.getAvatarPath()).isEqualTo("new");
        verify(storage, never()).delete(any());
        complete(TransactionSynchronization.STATUS_COMMITTED);
        verify(storage).delete("old");
        verify(storage, never()).delete("new");
    }

    @Test
    void rollbackDeletesNewFileAndPreservesOldFile() {
        user("old");
        when(storage.save("avatar.png", png)).thenReturn("new");

        avatars.upload(new MockMultipartFile("file", "avatar.png", "image/png", png));
        complete(TransactionSynchronization.STATUS_ROLLED_BACK);

        verify(storage).delete("new");
        verify(storage, never()).delete("old");
    }

    @Test
    void saveFailureAlsoCleansUpNewFileOnRollback() {
        user("old");
        when(storage.save("avatar.png", png)).thenReturn("new");
        when(users.save(any())).thenThrow(new IllegalStateException("save failed"));

        assertThatThrownBy(() -> avatars.upload(new MockMultipartFile("file", "avatar.png", "image/png", png)))
            .isInstanceOf(IllegalStateException.class);
        complete(TransactionSynchronization.STATUS_ROLLED_BACK);

        verify(storage).delete("new");
        verify(storage, never()).delete("old");
    }

    @Test
    void deleteClearsPathAndRemovesFileOnlyAfterCommit() {
        User user = user("old");

        avatars.delete();

        assertThat(user.hasAvatar()).isFalse();
        verify(storage, never()).delete(any());
        complete(TransactionSynchronization.STATUS_COMMITTED);
        verify(storage).delete("old");
    }

    @Test
    void missingAvatarIsNotFound() {
        user(null);

        assertThatThrownBy(() -> avatars.mine()).isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(storage);
    }

    @Test
    void rejectsOtherImageTypesSpoofedSignaturesEmptyAndOversizedFiles() {
        for (byte[] bytes : new byte[][]{new byte[0], "RIFFxxxxWEBP".getBytes(), "%PDF".getBytes(),
                {(byte) 0x89, 0x50, 0x4E, 0x47}, new byte[(int) AvatarUseCase.MAX_BYTES + 1]}) {
            assertThatThrownBy(() -> avatars.upload(new MockMultipartFile("file", "avatar.png", "image/png", bytes)))
                .isInstanceOf(DomainValidationException.class);
        }
        verifyNoInteractions(storage, users);
    }

    @Test
    void acceptsJpegAtTheSizeLimitAndDetectsDownloadTypeFromBytes() {
        User user = user(null);
        byte[] jpeg = new byte[(int) AvatarUseCase.MAX_BYTES];
        jpeg[0] = (byte) 0xFF;
        jpeg[1] = (byte) 0xD8;
        jpeg[2] = (byte) 0xFF;
        when(storage.save("avatar.jpg", jpeg)).thenReturn("jpeg");
        when(storage.read("jpeg")).thenReturn(jpeg);

        avatars.upload(new MockMultipartFile("file", "avatar.png", "image/png", jpeg));

        assertThat(user.hasAvatar()).isTrue();
        assertThat(avatars.mine().contentType()).isEqualTo("image/jpeg");
        assertThat(avatars.mine().bytes()).containsExactly(jpeg);
    }
}
