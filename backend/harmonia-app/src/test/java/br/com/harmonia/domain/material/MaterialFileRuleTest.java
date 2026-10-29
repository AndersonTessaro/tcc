package br.com.harmonia.domain.material;

import br.com.harmonia.lessoncore.DomainValidationException;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.params.provider.Arguments.arguments;

class MaterialFileRuleTest {
    private static byte[] utf8(String s) {
        return s.getBytes(StandardCharsets.UTF_8);
    }

    static Stream<Arguments> allowedFiles() {
        return Stream.of(
            arguments("score.PDF", utf8("%PDF-1.7")),
            arguments("photo.jpg", new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF}),
            arguments("example.mp3", new byte[] {'I', 'D', '3', 4}),
            arguments("score.musicxml", utf8("<?xml version=\"1.0\"")),
            arguments("score.xml", utf8("﻿ <score-partwise")),
            arguments("score.mxl", new byte[] {'P', 'K', 3, 4}),
            arguments("score.mscz", new byte[] {'P', 'K', 3, 4}));
    }

    @ParameterizedTest
    @MethodSource("allowedFiles")
    void validate_allowedFile_accepts(String name, byte[] head) {
        assertThatCode(() -> MaterialFileRule.validate(name, head.length, head)).doesNotThrowAnyException();
    }

    static Stream<Arguments> rejectedFiles() {
        return Stream.of(
            arguments("fake.pdf", utf8("MZ fake exe")),
            arguments("script.exe", utf8("%PDF-1.7")),
            arguments("noext", utf8("%PDF-1.7")),
            arguments("score.mxl", utf8("%PDF-1.7")),
            arguments("page.xml", utf8("<html>")),
            arguments(null, utf8("%PDF-1.7")));
    }

    @ParameterizedTest
    @MethodSource("rejectedFiles")
    void validate_contentNotMatchingAllowedType_rejects(String name, byte[] head) {
        assertThatThrownBy(() -> MaterialFileRule.validate(name, head.length, head))
            .isInstanceOf(DomainValidationException.class)
            .hasMessage("Material must be a PDF, image, audio, video or score file");
    }

    @Test
    void validate_emptyOrTooLarge_rejects() {
        byte[] pdf = utf8("%PDF-1.7");
        assertThatThrownBy(() -> MaterialFileRule.validate("a.pdf", 0, pdf)).hasMessage("Material is empty");
        assertThatThrownBy(() -> MaterialFileRule.validate("a.pdf", MaterialFileRule.MAX_BYTES + 1, pdf))
            .hasMessage("Material exceeds 50 MB");
    }
}
