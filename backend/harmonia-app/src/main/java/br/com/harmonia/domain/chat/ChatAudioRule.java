package br.com.harmonia.domain.chat;

import br.com.harmonia.domain.common.FileSignatures;
import br.com.harmonia.lessoncore.DomainValidationException;

import java.util.Locale;
import java.util.Set;

public final class ChatAudioRule {
    public static final long MAX_BYTES = 10L * 1024 * 1024;
    public static final int HEAD_BYTES = 16;
    public static final String PREVIEW = "Mensagem de voz";

    private static final Set<String> EXTENSIONS = Set.of("ogg", "oga", "opus", "webm", "m4a", "mp3", "aac", "wav");

    private ChatAudioRule() {}

    // Name, declared type and leading bytes are all client-controlled; each must look like audio.
    public static void validate(String fileName, String contentType, long sizeBytes, byte[] head) {
        if (sizeBytes <= 0) throw new DomainValidationException("Audio is empty");
        if (sizeBytes > MAX_BYTES) throw new DomainValidationException("Audio exceeds 10 MB");
        String extension = fileName == null ? "" : fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        if (contentType == null || !contentType.startsWith("audio/") || !EXTENSIONS.contains(extension)
                || !FileSignatures.isMedia(head))
            throw new DomainValidationException("Voice message must be an audio file");
    }
}
