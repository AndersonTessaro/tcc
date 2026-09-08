package br.com.harmonia.application.lesson;

import br.com.harmonia.infrastructure.persistence.lesson.LessonStatus;
import br.com.harmonia.lessoncore.SessionStatus;

/** Single translation point between the persisted {@link LessonStatus} and lesson-core's {@link SessionStatus}. */
final class LessonStatuses {

    private LessonStatuses() {
    }

    static SessionStatus toSessionStatus(LessonStatus status) {
        return switch (status) {
            case SCHEDULED -> SessionStatus.SCHEDULED;
            case DONE -> SessionStatus.DONE;
            case CANCELED -> SessionStatus.CANCELED;
        };
    }
}
