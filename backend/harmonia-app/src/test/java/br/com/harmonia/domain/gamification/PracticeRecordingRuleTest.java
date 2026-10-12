package br.com.harmonia.domain.gamification;

import br.com.harmonia.lessoncore.DomainValidationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.nio.charset.StandardCharsets;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.params.provider.Arguments.arguments;

class PracticeRecordingRuleTest {
    static final byte[] MP4 = {0, 0, 0, 0x18, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm'};
    static final byte[] WEBM = {0x1A, 0x45, (byte) 0xDF, (byte) 0xA3, 0, 0, 0, 0};
    static final byte[] MP3 = "ID3\u0004\u0000\u0000".getBytes(StandardCharsets.ISO_8859_1);
    static final byte[] AAC = {(byte) 0xFF, (byte) 0xF1, 0x50, (byte) 0x80};
    static final byte[] WAV = "RIFF\u0000\u0000\u0000\u0000WAVEfmt ".getBytes(StandardCharsets.ISO_8859_1);
    static final byte[] OGG = "OggS\u0000\u0002".getBytes(StandardCharsets.ISO_8859_1);
    static final byte[] EXE = {'M', 'Z', (byte) 0x90, 0, 3, 0, 0, 0};

    static Stream<Arguments> realMedia() {
        return Stream.of(
            arguments("pratica.mp4", "video/mp4", MP4),
            arguments("pratica.MOV", "video/quicktime", MP4),
            arguments("pratica.webm", "video/webm", WEBM),
            arguments("pratica.mp3", "audio/mpeg", MP3),
            arguments("pratica.aac", "audio/aac", AAC),
            arguments("pratica.wav", "audio/wav", WAV),
            arguments("pratica.ogg", "audio/ogg", OGG));
    }

    @ParameterizedTest
    @MethodSource("realMedia")
    void validate_realMediaHeaders_accepts(String name, String type, byte[] head) {
        assertThatCode(() -> PracticeRecordingRule.validate(name, type, head.length, head)).doesNotThrowAnyException();
    }

    @Test
    void validate_exactLimit_accepts() {
        assertThatCode(() -> PracticeRecordingRule.validate("p.mp4", "video/mp4", PracticeRecordingRule.MAX_BYTES, MP4))
            .doesNotThrowAnyException();
    }

    @Test
    void validate_executableNameWithMediaBytes_rejects() {
        assertNotMedia("aula.exe", "video/mp4", MP4);
    }

    @Test
    void validate_mediaNameWithExecutableBytes_rejects() {
        assertNotMedia("malware.mp4", "video/mp4", EXE);
    }

    @Test
    void validate_missingNameOrHead_rejects() {
        assertNotMedia(null, "video/mp4", MP4);
        assertNotMedia("p.mp4", "video/mp4", new byte[0]);
        assertNotMedia("p.mp4", "video/mp4", null);
    }

    @Test
    void validate_wrongOrMissingType_rejects() {
        assertNotMedia("a.mp4", "application/pdf", MP4);
        assertNotMedia("a.mp4", null, MP4);
    }

    @Test
    void validate_empty_rejects() {
        assertThatThrownBy(() -> PracticeRecordingRule.validate("p.mp4", "video/mp4", 0, new byte[0]))
            .isInstanceOf(DomainValidationException.class)
            .hasMessage("Recording is empty");
    }

    @Test
    void validate_overLimit_rejects() {
        assertThatThrownBy(() -> PracticeRecordingRule.validate("p.mp4", "video/mp4", PracticeRecordingRule.MAX_BYTES + 1, MP4))
            .isInstanceOf(DomainValidationException.class)
            .hasMessage("Recording exceeds 50 MB");
    }

    private static void assertNotMedia(String name, String type, byte[] head) {
        assertThatThrownBy(() -> PracticeRecordingRule.validate(name, type, 1, head))
            .isInstanceOf(DomainValidationException.class)
            .hasMessage("Recording must be an audio or video file");
    }
}
