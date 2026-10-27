package br.com.harmonia.application.account;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.profile.port.StudentRepository;
import br.com.harmonia.application.profile.port.TeacherRepository;
import br.com.harmonia.application.security.port.RefreshTokenRepository;
import br.com.harmonia.application.security.port.UserRepository;
import br.com.harmonia.infrastructure.persistence.security.RefreshToken;
import br.com.harmonia.infrastructure.persistence.security.User;
import br.com.harmonia.lessoncore.DomainValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountUseCaseTest {
    @Mock CurrentUserService current;
    @Mock UserRepository users;
    @Mock TeacherRepository teachers;
    @Mock StudentRepository students;
    @Mock RefreshTokenRepository tokens;
    @Mock PasswordEncoder encoder;
    private AccountUseCase account;
    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(UUID.randomUUID());
        user.setPassword("oldHash");
        when(current.userId()).thenReturn(user.getId());
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        account = new AccountUseCase(current, users, teachers, students, tokens, encoder);
    }

    @Test
    void changesPasswordAndRevokesEveryUnrevokedTokenIncludingExpiredOnes() {
        var active = new RefreshToken();
        active.setExpiresAt(LocalDateTime.now().plusDays(1));
        var expired = new RefreshToken();
        expired.setExpiresAt(LocalDateTime.now().minusDays(1));
        when(encoder.matches("Current@123", "oldHash")).thenReturn(true);
        when(encoder.matches("Changed@123", "oldHash")).thenReturn(false);
        when(encoder.encode("Changed@123")).thenReturn("newHash");
        when(tokens.findByUserIdAndRevokedAtIsNull(user.getId())).thenReturn(List.of(active, expired));
        account.changePassword("Current@123", "Changed@123");
        assertThat(user.getPassword()).isEqualTo("newHash");
        assertThat(active.getRevokedAt()).isNotNull().isEqualTo(expired.getRevokedAt());
    }

    @Test
    void wrongCurrentPasswordLeavesPasswordAndTokensUntouched() {
        when(encoder.matches("Wrong@123", "oldHash")).thenReturn(false);
        assertThatThrownBy(() -> account.changePassword("Wrong@123", "Changed@123"))
            .isInstanceOf(DomainValidationException.class).hasMessage("Current password is incorrect");
        assertThat(user.getPassword()).isEqualTo("oldHash");
        verifyNoInteractions(tokens);
        verify(encoder, never()).encode(anyString());
    }

    @Test
    void oversizedCurrentPasswordIsDomainValidationBeforeBcrypt() {
        assertThatThrownBy(() -> account.changePassword("á".repeat(37), "Changed@123"))
            .isInstanceOf(DomainValidationException.class).hasMessage("Current password is incorrect");
        verifyNoInteractions(encoder, tokens);
    }

    @Test
    void samePasswordLeavesAllSessionsUntouched() {
        when(encoder.matches("Current@123", "oldHash")).thenReturn(true);
        assertThatThrownBy(() -> account.changePassword("Current@123", "Current@123"))
            .isInstanceOf(DomainValidationException.class).hasMessage("New password must differ from current password");
        assertThat(user.getPassword()).isEqualTo("oldHash");
        verifyNoInteractions(tokens);
    }
}
