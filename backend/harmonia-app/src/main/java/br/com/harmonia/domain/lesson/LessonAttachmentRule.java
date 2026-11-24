package br.com.harmonia.domain.lesson;

import br.com.harmonia.domain.common.FileSignatures;
import br.com.harmonia.lessoncore.DomainValidationException;

import java.util.Locale;
import java.util.Set;

public final class LessonAttachmentRule {
    public static final long MAX_BYTES = 50L * 1024 * 1024;
    public static final long MAX_VIDEO_BYTES = 150L * 1024 * 1024;
    public static final int MAX_PER_LESSON = 10;
    public static final int HEAD_BYTES = 16;

    private static final String INVALID_TYPE = "Attachment must be a PDF, image, audio or video file";
    private static final Set<String> EXTENSIONS = Set.of(
        "pdf", "jpg", "jpeg", "png", "webp", "heic", "heif",
        "mp4", "m4v", "mov", "3gp", "webm", "mkv", "m4a", "mp3", "aac", "wav", "ogg", "oga", "opus", "flac", "amr");

    private static final Set<String> VIDEO_EXTENSIONS = Set.of("mp4", "m4v", "mov", "3gp", "webm", "mkv");

    private LessonAttachmentRule() {}

    public static long maxBytes(String fileName, String contentType) {
        return contentType != null && contentType.startsWith("video/") && VIDEO_EXTENSIONS.contains(extension(fileName))
            ? MAX_VIDEO_BYTES : MAX_BYTES;
    }

    public static void validate(String fileName, String contentType, long size, byte[] head, long currentCount) {
        if (size <= 0)
            throw new DomainValidationException("Attachment is empty");
        long limit = maxBytes(fileName, contentType);
        if (size > limit)
            throw new DomainValidationException("Attachment exceeds " + (limit / 1024 / 1024) + " MB");
        if (currentCount >= MAX_PER_LESSON)
            throw new DomainValidationException("Lesson already has 10 attachments");
        if (contentType == null || !(contentType.equals("application/pdf") || contentType.startsWith("image/")
            || contentType.startsWith("audio/") || contentType.startsWith("video/")))
            throw new DomainValidationException(INVALID_TYPE);
        if (size > MAX_BYTES && !FileSignatures.isVideo(head))
            throw new DomainValidationException(INVALID_TYPE);
        if (!EXTENSIONS.contains(extension(fileName))
            || !(FileSignatures.isPdf(head) || FileSignatures.isImage(head) || FileSignatures.isMedia(head)))
            throw new DomainValidationException(INVALID_TYPE);
    }

    private static String extension(String fileName) {
        if (fileName == null) return "";
        int dot = fileName.lastIndexOf('.');
        return dot < 0 ? "" : fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
}
