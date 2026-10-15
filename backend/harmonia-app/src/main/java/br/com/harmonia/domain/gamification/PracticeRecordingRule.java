package br.com.harmonia.domain.gamification;

import br.com.harmonia.lessoncore.DomainValidationException;

import br.com.harmonia.domain.common.FileSignatures;
import java.util.Locale;
import java.util.Set;

public class PracticeRecordingRule {
    public static final long MAX_BYTES = 50L * 1024 * 1024;
    public static final int HEAD_BYTES = 16;

    private static final String NOT_MEDIA = "Recording must be an audio or video file";
    private static final Set<String> EXTENSIONS = Set.of(
        "mp4", "m4v", "mov", "3gp", "webm", "mkv", "m4a", "mp3", "aac", "wav", "ogg", "oga", "opus", "flac", "amr");

    // Client-declared type and name are untrusted: name, type and leading bytes must all look like audio/video.
    public static void validate(String fileName, String contentType, long sizeBytes, byte[] head) {
        if (sizeBytes <= 0)
            throw new DomainValidationException("Recording is empty");
        if (sizeBytes > MAX_BYTES)
            throw new DomainValidationException("Recording exceeds 50 MB");
        if (contentType == null || (!contentType.startsWith("audio/") && !contentType.startsWith("video/")))
            throw new DomainValidationException(NOT_MEDIA);
        if (!EXTENSIONS.contains(extension(fileName)) || !FileSignatures.isMedia(head))
            throw new DomainValidationException(NOT_MEDIA);
    }

    private static String extension(String fileName) {
        if (fileName == null) return "";
        int dot = fileName.lastIndexOf('.');
        return dot < 0 ? "" : fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

}
