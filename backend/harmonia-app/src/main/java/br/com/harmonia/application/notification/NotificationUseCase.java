package br.com.harmonia.application.notification;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.notification.port.NotificationRepository;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.domain.notification.NotificationType;
import br.com.harmonia.infrastructure.persistence.notification.Notification;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class NotificationUseCase {
    private final NotificationRepository notifications;
    private final CurrentUserService current;

    public NotificationUseCase(NotificationRepository notifications, CurrentUserService current) {
        this.notifications = notifications;
        this.current = current;
    }

    public record NotificationItem(UUID id, NotificationType type, String title, String body, UUID studentId,
                                   UUID lessonId, UUID practiceId, boolean read, Instant createdAt) {
        static NotificationItem of(Notification n) {
            return new NotificationItem(n.getId(), n.getType(), n.getTitle(), n.getBody(), n.getStudentId(),
                n.getLessonId(), n.getPracticeId(), n.getReadAt() != null, n.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant());
        }
    }
    public record NotificationList(long unreadCount, List<NotificationItem> items) {}
    public record UnreadCount(long unreadCount) {}

    public NotificationList list(int limit) {
        UUID userId = current.userId();
        return new NotificationList(notifications.countByUserIdAndReadAtIsNull(userId),
            notifications.findByUserIdOrderByCreatedAtDescIdDesc(userId, PageRequest.of(0, limit))
                .stream().map(NotificationItem::of).toList());
    }

    public UnreadCount unreadCount() {
        return new UnreadCount(notifications.countByUserIdAndReadAtIsNull(current.userId()));
    }

    @Transactional
    public void markRead(UUID id) {
        Notification notification = notifications.findByIdAndUserId(id, current.userId())
            .orElseThrow(() -> new ResourceNotFoundException("Notification"));
        if (notification.getReadAt() == null) notification.setReadAt(LocalDateTime.now());
    }

    @Transactional
    public void markAllRead() {
        notifications.markAllRead(current.userId(), LocalDateTime.now());
    }
}
