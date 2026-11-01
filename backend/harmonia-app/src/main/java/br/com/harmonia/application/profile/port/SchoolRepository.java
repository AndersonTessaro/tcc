package br.com.harmonia.application.profile.port;

import br.com.harmonia.infrastructure.persistence.profile.School;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SchoolRepository extends JpaRepository<School, UUID> {
}
