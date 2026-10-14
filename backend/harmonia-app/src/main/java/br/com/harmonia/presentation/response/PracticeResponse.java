package br.com.harmonia.presentation.response;

import br.com.harmonia.infrastructure.persistence.gamification.Practice;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record PracticeResponse(UUID id, LocalDate date, int durationMin, String notes, String difficulty,
                               Integer rating, Recording recording) {
    public record Recording(String fileName, String contentType, long sizeBytes, LocalDateTime uploadedAt) {}

    public static PracticeResponse of(Practice practice) {
        var recording = practice.getRecording();
        return new PracticeResponse(practice.getId(), practice.getDate(), practice.getDurationMin(), practice.getNotes(),
            practice.getDifficulty(), practice.getRating(),
            recording == null ? null : new Recording(recording.getFileName(), recording.getContentType(),
                recording.getSizeBytes(), recording.getUploadedAt()));
    }
}
