package br.com.harmonia.application.gamification;

import br.com.harmonia.application.gamification.port.ProgressRepository;
import br.com.harmonia.application.gamification.port.ProcessedDomainEventRepository;
import br.com.harmonia.application.profile.port.StudentRepository;
import br.com.harmonia.domain.gamification.GamificationService;
import br.com.harmonia.infrastructure.persistence.gamification.Progress;
import br.com.harmonia.infrastructure.persistence.event.ProcessedDomainEvent;
import br.com.harmonia.lessoncore.AttendanceEffect;
import br.com.harmonia.lessoncore.AttendanceRecordedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class GamificationAttendanceListener {
    private final ProgressRepository progresses;
    private final StudentRepository students;
    private final ProcessedDomainEventRepository processedEvents;
    private final GamificationService gamification = new GamificationService();

    public GamificationAttendanceListener(ProgressRepository progresses, StudentRepository students,
                                          ProcessedDomainEventRepository processedEvents) {
        this.progresses = progresses;
        this.students = students;
        this.processedEvents = processedEvents;
    }

    @EventListener
    @Transactional
    public void onAttendanceRecorded(AttendanceRecordedEvent event) {
        if (event.effect() == AttendanceEffect.NONE) {
            return;
        }
        if (processedEvents.existsById(event.eventId())) {
            return;
        }
        processedEvents.save(new ProcessedDomainEvent(event.eventId(), event.getClass().getSimpleName()));
        Progress progress = progresses.findByStudentId(event.studentId()).orElseGet(() -> {
            Progress created = new Progress();
            created.setStudent(students.getReferenceById(event.studentId()));
            return created;
        });
        int delta = event.effect() == AttendanceEffect.AWARD_XP
            ? gamification.xpFromAttendance()
            : -gamification.xpFromAttendance();
        progress.setXpTotal(Math.max(0, progress.getXpTotal() + delta));
        progress.setLevel(gamification.level(progress.getXpTotal()));
        progresses.save(progress);
    }
}
