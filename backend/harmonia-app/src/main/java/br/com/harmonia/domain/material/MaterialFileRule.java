package br.com.harmonia.domain.material;

import br.com.harmonia.domain.common.FileSignatures;
import br.com.harmonia.lessoncore.DomainValidationException;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;

public final class MaterialFileRule {
    public static final long MAX_BYTES = 50L * 1024 * 1024;
    public static final int HEAD_BYTES = 16;

    private static final String INVALID_TYPE = "Material must be a PDF, image, audio, video or score file";
    private static final Set<String> MEDIA_EXTENSIONS = Set.of(
        "pdf", "jpg", "jpeg", "png", "webp", "heic", "heif",
        "mp4", "m4v", "mov", "3gp", "webm", "mkv", "m4a", "mp3", "aac", "wav", "ogg", "oga", "opus", "flac", "amr");
    private static final Set<String> XML_SCORE_EXTENSIONS = Set.of("musicxml", "xml");
    private static final Set<String> ZIP_SCORE_EXTENSIONS = Set.of("mxl", "mscz");

    private MaterialFileRule() {}

    public static void validate(String fileName, long size, byte[] head) {
        if (size <= 0)
            throw new DomainValidationException("Material is empty");
        if (size > MAX_BYTES)
            throw new DomainValidationException("Material exceeds 50 MB");
        String ext = extension(fileName);
        boolean valid = MEDIA_EXTENSIONS.contains(ext)
                ? FileSignatures.isPdf(head) || FileSignatures.isImage(head) || FileSignatures.isMedia(head)
            : XML_SCORE_EXTENSIONS.contains(ext) ? isXml(head)
            : ZIP_SCORE_EXTENSIONS.contains(ext) && isZip(head);
        if (!valid)
            throw new DomainValidationException(INVALID_TYPE);
    }

    private static boolean isXml(byte[] head) {
        String text = new String(head, StandardCharsets.UTF_8);
        if (text.startsWith("﻿")) text = text.substring(1);
        text = text.stripLeading();
        return text.startsWith("<?xml") || text.startsWith("<score-");
    }

    private static boolean isZip(byte[] head) {
        return head.length >= 4 && head[0] == 'P' && head[1] == 'K' && head[2] == 3 && head[3] == 4;
    }

    private static String extension(String fileName) {
        if (fileName == null) return "";
        int dot = fileName.lastIndexOf('.');
        return dot < 0 ? "" : fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
}
