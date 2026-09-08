package br.com.harmonia.lessoncore;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LessonLifecyclePolicyTest {
    private final LessonLifecyclePolicy policy = new LessonLifecyclePolicy();

    @Test
    void scheduledLessonCanBeCompletedOrCanceled() {
        assertThatCode(() -> policy.validateTransition(SessionStatus.SCHEDULED, SessionStatus.DONE))
            .doesNotThrowAnyException();
        assertThatCode(() -> policy.validateTransition(SessionStatus.SCHEDULED, SessionStatus.CANCELED))
            .doesNotThrowAnyException();
    }

    @Test
    void repeatingTheCurrentStatusIsAllowed() {
        assertThatCode(() -> policy.validateTransition(SessionStatus.DONE, SessionStatus.DONE))
            .doesNotThrowAnyException();
    }

    @Test
    void completedLessonCannotBeReopened() {
        assertThatThrownBy(() -> policy.validateTransition(SessionStatus.DONE, SessionStatus.SCHEDULED))
            .isInstanceOf(DomainValidationException.class)
            .hasMessageContaining("DONE to SCHEDULED");
    }

    @Test
    void canceledLessonCannotBeCompleted() {
        assertThatThrownBy(() -> policy.validateTransition(SessionStatus.CANCELED, SessionStatus.DONE))
            .isInstanceOf(DomainValidationException.class);
    }

    @Test
    void missingStatus_throws() {
        assertThatThrownBy(() -> policy.validateTransition(null, SessionStatus.DONE))
            .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> policy.validateTransition(SessionStatus.SCHEDULED, null))
            .isInstanceOf(NullPointerException.class);
    }
}
