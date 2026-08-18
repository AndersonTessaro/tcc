package br.com.harmonia.application.profile.port;

import br.com.harmonia.infrastructure.persistence.profile.Instrument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface InstrumentRepository extends JpaRepository<Instrument, UUID> {
}
