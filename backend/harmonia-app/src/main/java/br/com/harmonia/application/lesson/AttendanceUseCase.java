package br.com.harmonia.application.lesson;

import br.com.harmonia.application.lesson.port.AttendanceRepository;
import br.com.harmonia.application.lesson.port.LessonRepository;
import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.infrastructure.persistence.lesson.Attendance;
import br.com.harmonia.infrastructure.persistence.lesson.AttendanceStatus;
import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import br.com.harmonia.lessoncore.AttendanceDecision;
import br.com.harmonia.lessoncore.AttendanceOutcome;
import br.com.harmonia.lessoncore.AttendanceRecordedEvent;
import br.com.harmonia.lessoncore.AttendanceRecordingRule;
import br.com.harmonia.lessoncore.DomainEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class AttendanceUseCase {
    private final AttendanceRepository attendances;
    private final LessonRepository lessons;
    private final CurrentUserService current;
    private final DomainEventPublisher events;
    private final AttendanceRecordingRule recordingRule = new AttendanceRecordingRule();

    public AttendanceUseCase(AttendanceRepository attendances, LessonRepository lessons,
                             CurrentUserService current, DomainEventPublisher events) {
        this.attendances = attendances;
        this.lessons = lessons;
        this.current = current;
        this.events = events;
    }

    @Transactional
    public Attendance register(UUID lessonId, AttendanceStatus status, String justification) {
        Lesson lesson = lessons.findById(lessonId).orElseThrow();
        current.assertOwnedByCurrentTeacher(lesson.getEnrollment());

        Optional<Attendance> existing = attendances.findByLessonId(lessonId);
        AttendanceOutcome previousOutcome = existing.map(a -> toOutcome(a.getStatus())).orElse(null);

        Attendance a = existing.orElseGet(Attendance::new);
        a.setLesson(lesson);
        a.setStatus(status);
        a.setJustification(justification);
        a.setRegisteredAt(LocalDateTime.now());
        Attendance saved = attendances.save(a);

        AttendanceDecision decision = recordingRule.evaluate(previousOutcome, toOutcome(status));
        UUID studentId = lesson.getEnrollment().getStudent().getId();
        events.publish(new AttendanceRecordedEvent(lessonId, studentId, toOutcome(status), decision.xpEligible()));

        return saved;
    }

    private static AttendanceOutcome toOutcome(AttendanceStatus status) {
        return switch (status) {
            case PRESENT -> AttendanceOutcome.PRESENT;
            case ABSENT -> AttendanceOutcome.ABSENT;
            case EXCUSED -> AttendanceOutcome.EXCUSED;
        };
    }
}
