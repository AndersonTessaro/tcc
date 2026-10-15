package br.com.harmonia.application.notification;

import br.com.harmonia.application.notification.port.NotificationRepository;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.domain.gamification.GoalCompletedEvent;
import br.com.harmonia.domain.gamification.PracticeRecordedEvent;
import br.com.harmonia.domain.notification.NotificationType;
import br.com.harmonia.infrastructure.persistence.notification.Notification;
import br.com.harmonia.infrastructure.persistence.profile.EnrollmentStatus;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.UUID;
import java.util.function.Function;

@Component
@Transactional
public class NotificationListener {
    private static final DateTimeFormatter DAY_MONTH = DateTimeFormatter.ofPattern("dd/MM");
    private final EnrollmentRepository enrollments;
    private final NotificationRepository notifications;

    public NotificationListener(EnrollmentRepository enrollments, NotificationRepository notifications) {
        this.enrollments = enrollments;
        this.notifications = notifications;
    }

    @EventListener
    public void onPracticeRecorded(PracticeRecordedEvent event) {
        notifyTeachers(event.studentId(), NotificationType.PRACTICE_RECORDED, "Nova prática registrada",
            name -> name + " praticou " + event.durationMin() + " min (" + event.date().format(DAY_MONTH) + ")",
            event.practiceId());
    }

    @EventListener
    public void onGoalCompleted(GoalCompletedEvent event) {
        notifyTeachers(event.studentId(), NotificationType.GOAL_COMPLETED, "Meta concluída",
            name -> name + " concluiu a meta \"" + event.title() + "\"", null);
    }

    private void notifyTeachers(UUID studentId, NotificationType type, String title,
                                Function<String, String> body, UUID practiceId) {
        var recipients = new HashSet<UUID>();
        for (var enrollment : enrollments.findByStudentId(studentId)) {
            if (enrollment.getStatus() != EnrollmentStatus.ACTIVE) continue;
            UUID userId = enrollment.getTeacher().getUser().getId();
            if (!recipients.add(userId)) continue;
            Notification notification = new Notification();
            notification.setUserId(userId);
            notification.setType(type);
            notification.setTitle(title);
            notification.setBody(body.apply(enrollment.getStudent().getUser().nameForDisplay()));
            notification.setStudentId(studentId);
            notification.setPracticeId(practiceId);
            notifications.save(notification);
        }
    }
}
