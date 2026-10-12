package br.com.harmonia.infrastructure.persistence.gamification;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Embeddable
@Getter @NoArgsConstructor @AllArgsConstructor
public class PracticeRecording {
    @Column(name = "recording_file_name")
    private String fileName;

    @Column(name = "recording_storage_path")
    private String storagePath;

    @Column(name = "recording_content_type")
    private String contentType;

    @Column(name = "recording_size_bytes")
    private Long sizeBytes;

    @Column(name = "recording_uploaded_at")
    private LocalDateTime uploadedAt;
}
