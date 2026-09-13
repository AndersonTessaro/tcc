package br.com.harmonia.infrastructure.persistence.event;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "processed_domain_event")
@Getter
@Setter
@NoArgsConstructor
public class ProcessedDomainEvent {
    @Id
    private UUID eventId;

    @Column(nullable = false, length = 120)
    private String eventType;

    @Column(nullable = false)
    private Instant processedAt = Instant.now();

    public ProcessedDomainEvent(UUID eventId, String eventType) {
        this.eventId = eventId;
        this.eventType = eventType;
    }
}
