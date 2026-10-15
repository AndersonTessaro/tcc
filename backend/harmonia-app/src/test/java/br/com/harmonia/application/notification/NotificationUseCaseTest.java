package br.com.harmonia.application.notification;

import br.com.harmonia.infrastructure.persistence.notification.Notification;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.TimeZone;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationUseCaseTest {
    @Test
    void convertsJvmLocalCreationTimeToAnAbsoluteInstant() {
        TimeZone previous = TimeZone.getDefault();
        try {
            TimeZone.setDefault(TimeZone.getTimeZone("America/Sao_Paulo"));
            Notification notification = new Notification();
            notification.setCreatedAt(LocalDateTime.of(2026, 10, 15, 12, 0));

            assertThat(NotificationUseCase.NotificationItem.of(notification).createdAt())
                .isEqualTo(Instant.parse("2026-10-15T15:00:00Z"));
        } finally {
            TimeZone.setDefault(previous);
        }
    }
}
