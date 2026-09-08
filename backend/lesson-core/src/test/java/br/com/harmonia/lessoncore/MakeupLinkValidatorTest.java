package br.com.harmonia.lessoncore;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MakeupLinkValidatorTest {

    private final MakeupLinkValidator validator = new MakeupLinkValidator();

    @Test
    void doneLessonWithoutExistingMakeup_passesValidation() {
        assertThatCode(() -> validator.validate(SessionStatus.DONE, false))
            .doesNotThrowAnyException();
    }

    @Test
    void lessonAlreadyLinkedToMakeup_throws() {
        assertThatThrownBy(() -> validator.validate(SessionStatus.DONE, true))
            .isInstanceOf(InvalidMakeupLinkException.class)
            .hasMessageContaining("already has a makeup");
    }

    @Test
    void canceledLesson_throws() {
        assertThatThrownBy(() -> validator.validate(SessionStatus.CANCELED, false))
            .isInstanceOf(InvalidMakeupLinkException.class)
            .hasMessageContaining("completed");
    }

    @Test
    void scheduledLesson_throws() {
        assertThatThrownBy(() -> validator.validate(SessionStatus.SCHEDULED, false))
            .isInstanceOf(InvalidMakeupLinkException.class)
            .hasMessageContaining("completed");
    }
}
