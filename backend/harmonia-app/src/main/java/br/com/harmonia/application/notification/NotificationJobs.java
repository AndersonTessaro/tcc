package br.com.harmonia.application.notification;

import br.com.harmonia.application.lesson.port.LessonRepository;
import br.com.harmonia.application.notification.port.NotificationRepository;
import br.com.harmonia.domain.notification.NotificationType;
import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

import static java.util.stream.Collectors.groupingBy;

@Service
@Transactional
public class NotificationJobs {
    private static final DateTimeFormatter DAY_MONTH = DateTimeFormatter.ofPattern("dd/MM");
    private static final DateTimeFormatter HOUR_MINUTE = DateTimeFormatter.ofPattern("HH:mm");
    private final LessonRepository lessons;
    private final NotificationRepository notifications;
    private final ZoneId zone;

    public NotificationJobs(LessonRepository lessons, NotificationRepository notifications,
                            @Value("${app.notifications.zone:America/Sao_Paulo}") String zone) {
        this.lessons = lessons;
        this.notifications = notifications;
        this.zone = ZoneId.of(zone);
    }

    @Scheduled(cron = "${app.notifications.cron:0 0 7 * * *}", zone = "${app.notifications.zone:America/Sao_Paulo}")
    public void runDaily() {
        runFor(LocalDate.now(zone));
    }

    public void runFor(LocalDate today) {
        lessons.scheduledForNotifications(today).stream()
            .collect(groupingBy(l -> l.getEnrollment().getTeacher().getUser().getId()))
            .forEach((userId, scheduled) -> notifyLessonsToday(userId, scheduled, today));
        for (Lesson lesson : lessons.missingAttendanceForNotifications(today.minusDays(7), today.minusDays(1))) {
            var enrollment = lesson.getEnrollment();
            notifications.insertIfAbsent(enrollment.getTeacher().getUser().getId(), NotificationType.ATTENDANCE_MISSING.name(),
                "Presença pendente", "Aula de " + enrollment.getStudent().getUser().nameForDisplay() + " em "
                    + lesson.getDate().format(DAY_MONTH) + " às " + lesson.getStartTime().format(HOUR_MINUTE)
                    + " está sem presença e conta como falta.",
                enrollment.getStudent().getId(), lesson.getId(), "attendance-missing:" + lesson.getId(), LocalDateTime.now());
        }
        notifications.deleteOlderThan(today.minusDays(90).atStartOfDay());
    }

    private void notifyLessonsToday(UUID userId, List<Lesson> scheduled, LocalDate today) {
        Lesson first = scheduled.getFirst();
        String body = "Você tem " + scheduled.size() + (scheduled.size() == 1 ? " aula hoje." : " aulas hoje.")
            + " Primeira às " + first.getStartTime().format(HOUR_MINUTE) + " com "
            + first.getEnrollment().getStudent().getUser().nameForDisplay() + ".";
        notifications.insertIfAbsent(userId, NotificationType.LESSONS_TODAY.name(), "Aulas de hoje", body,
            null, null, "lessons-today:" + today, LocalDateTime.now());
    }
}
