package br.com.harmonia.application.admin;

import br.com.harmonia.application.admin.port.UserStorageRepository;
import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.security.port.PermissionRepository;
import br.com.harmonia.application.security.port.RoleRepository;
import br.com.harmonia.application.security.port.UserRepository;
import br.com.harmonia.domain.common.DuplicateResourceException;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.infrastructure.persistence.security.Role;
import br.com.harmonia.infrastructure.persistence.security.User;
import br.com.harmonia.infrastructure.security.TokenService;
import br.com.harmonia.infrastructure.storage.FileStoragePort;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeleteUserUseCaseTest {
    @Mock UserRepository users;
    @Mock RoleRepository roles;
    @Mock PermissionRepository permissions;
    @Mock PasswordEncoder encoder;
    @Mock TokenService tokens;
    @Mock CurrentUserService current;
    @Mock UserStorageRepository paths;
    @Mock FileStoragePort storage;
    @InjectMocks SecurityAdminUseCase useCase;

    @BeforeEach
    void begin() {
        TransactionSynchronizationManager.initSynchronization();
    }

    @AfterEach
    void clear() {
        TransactionSynchronizationManager.clear();
    }

    private User user() {
        User user = new User();
        user.setId(UUID.randomUUID());
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        return user;
    }

    private void complete(int status) {
        TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCompletion(status));
    }

    @Test
    void deletesUserAndCleansAllCollectedFilesAfterCommit() {
        User user = user();
        when(current.userId()).thenReturn(UUID.randomUUID());
        when(paths.pathsForUser(user.getId())).thenReturn(List.of("avatar", "material", "attachment", "recording"));

        useCase.deleteUser(user.getId());

        var order = inOrder(paths, users);
        order.verify(paths).pathsForUser(user.getId());
        order.verify(users).delete(user);
        verifyNoInteractions(storage);
        complete(TransactionSynchronization.STATUS_COMMITTED);
        for (String path : List.of("avatar", "material", "attachment", "recording")) verify(storage).delete(path);
    }

    @Test
    void rollbackKeepsEveryFile() {
        User user = user();
        when(current.userId()).thenReturn(UUID.randomUUID());
        when(paths.pathsForUser(user.getId())).thenReturn(List.of("material"));

        useCase.deleteUser(user.getId());
        complete(TransactionSynchronization.STATUS_ROLLED_BACK);

        verifyNoInteractions(storage);
    }

    @Test
    void refusesSelfDeletion() {
        User user = user();
        when(current.userId()).thenReturn(user.getId());

        assertThatThrownBy(() -> useCase.deleteUser(user.getId())).isInstanceOf(DuplicateResourceException.class);
        verify(users, never()).delete(any());
        verifyNoInteractions(paths, storage);
    }

    @Test
    void refusesAnyUserWithAdminRole() {
        User user = user();
        Role admin = new Role();
        admin.setName("ADMIN");
        user.setRoles(Set.of(admin));
        when(current.userId()).thenReturn(UUID.randomUUID());

        assertThatThrownBy(() -> useCase.deleteUser(user.getId())).isInstanceOf(DuplicateResourceException.class);
        verify(users, never()).delete(any());
        verifyNoInteractions(paths, storage);
    }

    @Test
    void unknownUserIsNotFound() {
        assertThatThrownBy(() -> useCase.deleteUser(UUID.randomUUID())).isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(paths, storage);
    }
}
