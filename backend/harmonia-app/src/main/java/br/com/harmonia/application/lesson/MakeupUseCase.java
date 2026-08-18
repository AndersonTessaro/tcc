package br.com.harmonia.application.lesson;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.lesson.port.LessonRepository;
import br.com.harmonia.application.lesson.port.MakeupLessonRepository;
import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import br.com.harmonia.infrastructure.persistence.lesson.LessonStatus;
import br.com.harmonia.infrastructure.persistence.lesson.MakeupLesson;
import br.com.harmonia.lessoncore.MakeupLinkValidator;
import br.com.harmonia.lessoncore.SessionStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Service
public class MakeupUseCase {
    private final LessonRepository lessons;
    private final MakeupLessonRepository makeups;
    private final CurrentUserService current;
    private final MakeupLinkValidator validator = new MakeupLinkValidator();

    public MakeupUseCase(LessonRepository lessons, MakeupLessonRepository makeups, CurrentUserService current) {
        this.lessons = lessons;
        this.makeups = makeups;
        this.current = current;
    }

    /** RN10: creates a new lesson linked to the original one (makeup). */
    @Transactional
    public MakeupLesson create(UUID originalLessonId, LocalDate date, LocalTime startTime,
                               LocalTime endTime, String reason) {
        Lesson original = lessons.findById(originalLessonId).orElseThrow();
        current.assertOwnedByCurrentTeacher(original.getEnrollment());

        validator.validate(toSessionStatus(original.getStatus()), makeups.existsByOriginalLessonId(originalLessonId));

        Lesson makeupLesson = new Lesson();
        makeupLesson.setEnrollment(original.getEnrollment());
        makeupLesson.setDate(date);
        makeupLesson.setStartTime(startTime);
        makeupLesson.setEndTime(endTime);
        makeupLesson.setStatus(LessonStatus.SCHEDULED);
        makeupLesson.setContent(original.getContent());
        lessons.save(makeupLesson);

        MakeupLesson link = new MakeupLesson();
        link.setOriginalLesson(original);
        link.setNewLesson(makeupLesson);
        link.setReason(reason);
        return makeups.save(link);
    }

    private static SessionStatus toSessionStatus(LessonStatus status) {
        return switch (status) {
            case SCHEDULED -> SessionStatus.SCHEDULED;
            case DONE -> SessionStatus.DONE;
            case CANCELED -> SessionStatus.CANCELED;
        };
    }
}
