package br.com.harmonia.domain.gamification;

import br.com.harmonia.lessoncore.DomainValidationException;

public class PracticeRecordingRule {
    public static final long MAX_BYTES = 50L * 1024 * 1024;

    public static void validate(String contentType, long sizeBytes) {
        if (sizeBytes <= 0)
            throw new DomainValidationException("Recording is empty");
        if (sizeBytes > MAX_BYTES)
            throw new DomainValidationException("Recording exceeds 50 MB");
        if (contentType == null || (!contentType.startsWith("audio/") && !contentType.startsWith("video/")))
            throw new DomainValidationException("Recording must be an audio or video file");
    }
}
