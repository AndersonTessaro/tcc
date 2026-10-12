package br.com.harmonia.domain.gamification;

import br.com.harmonia.lessoncore.DomainValidationException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PracticeRecordingRuleTest {

    @Test
    void validate_audioAndVideo_accepts() {
        assertThatCode(() -> PracticeRecordingRule.validate("video/mp4", 1)).doesNotThrowAnyException();
        assertThatCode(() -> PracticeRecordingRule.validate("audio/mpeg", 1)).doesNotThrowAnyException();
    }

    @Test
    void validate_exactLimit_accepts() {
        assertThatCode(() -> PracticeRecordingRule.validate("video/mp4", PracticeRecordingRule.MAX_BYTES))
            .doesNotThrowAnyException();
    }

    @Test
    void validate_wrongType_rejects() {
        assertThatThrownBy(() -> PracticeRecordingRule.validate("application/pdf", 1))
            .isInstanceOf(DomainValidationException.class)
            .hasMessage("Recording must be an audio or video file");
    }

    @Test
    void validate_missingType_rejects() {
        assertThatThrownBy(() -> PracticeRecordingRule.validate(null, 1))
            .isInstanceOf(DomainValidationException.class)
            .hasMessage("Recording must be an audio or video file");
    }

    @Test
    void validate_empty_rejects() {
        assertThatThrownBy(() -> PracticeRecordingRule.validate("video/mp4", 0))
            .isInstanceOf(DomainValidationException.class)
            .hasMessage("Recording is empty");
    }

    @Test
    void validate_overLimit_rejects() {
        assertThatThrownBy(() -> PracticeRecordingRule.validate("video/mp4", PracticeRecordingRule.MAX_BYTES + 1))
            .isInstanceOf(DomainValidationException.class)
            .hasMessage("Recording exceeds 50 MB");
    }
}
