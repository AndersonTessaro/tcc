package br.com.harmonia.domain.gamification;

import br.com.harmonia.lessoncore.DomainValidationException;

import java.nio.charset.StandardCharsets;
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
        if (!EXTENSIONS.contains(extension(fileName)) || !hasMediaSignature(head))
            throw new DomainValidationException(NOT_MEDIA);
    }

    private static String extension(String fileName) {
        if (fileName == null) return "";
        int dot = fileName.lastIndexOf('.');
        return dot < 0 ? "" : fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    // ISO BMFF (mp4/mov/3gp/m4a), EBML (webm/mkv), MP3 ID3, MPEG/ADTS frame sync (mp3/aac), WAV, Ogg, FLAC, AMR.
    private static boolean hasMediaSignature(byte[] head) {
        if (head == null || head.length < 4) return false;
        return startsWith(head, 4, "ftyp")
            || startsWith(head, 0, new byte[] {0x1A, 0x45, (byte) 0xDF, (byte) 0xA3})
            || startsWith(head, 0, "ID3")
            || ((head[0] & 0xFF) == 0xFF && (head[1] & 0xE0) == 0xE0)
            || (startsWith(head, 0, "RIFF") && startsWith(head, 8, "WAVE"))
            || startsWith(head, 0, "OggS")
            || startsWith(head, 0, "fLaC")
            || startsWith(head, 0, "#!AMR");
    }

    private static boolean startsWith(byte[] head, int offset, String ascii) {
        return startsWith(head, offset, ascii.getBytes(StandardCharsets.US_ASCII));
    }

    private static boolean startsWith(byte[] head, int offset, byte[] expected) {
        if (head.length < offset + expected.length) return false;
        for (int i = 0; i < expected.length; i++)
            if (head[offset + i] != expected[i]) return false;
        return true;
    }
}
