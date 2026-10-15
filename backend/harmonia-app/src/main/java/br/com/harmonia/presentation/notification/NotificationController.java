package br.com.harmonia.presentation.notification;

import br.com.harmonia.application.notification.NotificationUseCase;
import br.com.harmonia.application.notification.NotificationUseCase.NotificationList;
import br.com.harmonia.application.notification.NotificationUseCase.UnreadCount;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/notifications")
@PreAuthorize("isAuthenticated()")
public class NotificationController {
    private final NotificationUseCase notifications;

    public NotificationController(NotificationUseCase notifications) {
        this.notifications = notifications;
    }

    public record NotificationQuery(@Min(1) @Max(100) Integer limit) {
        public NotificationQuery {
            if (limit == null) limit = 50;
        }
    }

    @GetMapping
    public NotificationList list(@Valid @ModelAttribute NotificationQuery query) {
        return notifications.list(query.limit());
    }

    @GetMapping("/unread-count")
    public UnreadCount unreadCount() {
        return notifications.unreadCount();
    }

    @PatchMapping("/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(@PathVariable UUID id) {
        notifications.markRead(id);
    }

    @PostMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllRead() {
        notifications.markAllRead();
    }
}
