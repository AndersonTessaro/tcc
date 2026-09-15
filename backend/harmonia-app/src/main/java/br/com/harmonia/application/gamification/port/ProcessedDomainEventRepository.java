package br.com.harmonia.application.gamification.port;

import br.com.harmonia.infrastructure.persistence.event.ProcessedDomainEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProcessedDomainEventRepository extends JpaRepository<ProcessedDomainEvent, UUID> {
}
