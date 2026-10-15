package br.com.harmonia.domain.lesson;

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

class LessonAttachmentRuleTest {
    private static final byte[] PDF = "%PDF-1.7".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] MP4 = {0, 0, 0, 0x18, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm'};
    private static final String INVALID_TYPE = "Attachment must be a PDF, image, audio or video file";

    static Stream<Arguments> allowedFiles() {
        return Stream.of(
            arguments("score.pdf", "application/pdf", PDF),
            arguments("photo.jpg", "image/jpeg", new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF}),
            arguments("photo.JPEG", "image/jpeg", new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF}),
            arguments("score.png", "image/png", new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47}),
            arguments("score.webp", "image/webp", "RIFF0000WEBP".getBytes(StandardCharsets.US_ASCII)),
            arguments("photo.heic", "image/heic", MP4),
            arguments("photo.heif", "image/heif", MP4),
            arguments("example.mp4", "video/mp4", MP4),
            arguments("example.mp3", "audio/mpeg", new byte[] {'I', 'D', '3', 4}));
    }

    @ParameterizedTest
    @MethodSource("allowedFiles")
    void validate_allowedFile_accepts(String name, String type, byte[] head) {
        assertThatCode(() -> LessonAttachmentRule.validate(name, type, head.length, head, 0))
            .doesNotThrowAnyException();
    }

    static Stream<Arguments> invalidFiles() {
        return Stream.of(
            arguments("score.pdf", "application/pdf", 8L, new byte[] {'M', 'Z', 0, 0}, 0L, INVALID_TYPE),
            arguments("score.exe", "application/pdf", 8L, PDF, 0L, INVALID_TYPE),
            arguments("score.pdf", "application/pdf", 0L, new byte[0], 0L, "Attachment is empty"),
            arguments("score.pdf", "application/pdf", LessonAttachmentRule.MAX_BYTES + 1, PDF, 0L, "Attachment exceeds 50 MB"),
            arguments("score.pdf", "application/pdf", 8L, PDF, 10L, "Lesson already has 10 attachments"),
            arguments("score.pdf", "application/pdf", 8L, PDF, 11L, "Lesson already has 10 attachments"),
            arguments(null, "application/pdf", 8L, PDF, 0L, INVALID_TYPE),
            arguments("score", "application/pdf", 8L, PDF, 0L, INVALID_TYPE),
            arguments("score.pdf", null, 8L, PDF, 0L, INVALID_TYPE),
            arguments("score.pdf", "application/octet-stream", 8L, PDF, 0L, INVALID_TYPE),
            arguments("score.pdf", "application/pdf", 8L, null, 0L, INVALID_TYPE),
            arguments("score.pdf", "application/pdf", 8L, new byte[0], 0L, INVALID_TYPE));
    }

    @ParameterizedTest
    @MethodSource("invalidFiles")
    void validate_invalidFile_rejects(String name, String type, long size, byte[] head, long count, String message) {
        assertThatThrownBy(() -> LessonAttachmentRule.validate(name, type, size, head, count))
            .isInstanceOf(DomainValidationException.class).hasMessage(message);
    }

    @Test
    void validate_exactSizeLimitAndTenthAttachment_accepts() {
        assertThatCode(() -> LessonAttachmentRule.validate("score.pdf", "application/pdf",
            LessonAttachmentRule.MAX_BYTES, PDF, 9)).doesNotThrowAnyException();
    }
}
