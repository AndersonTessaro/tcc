package br.com.harmonia.application.profile.port;

import br.com.harmonia.infrastructure.persistence.profile.ClassGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ClassGroupRepository extends JpaRepository<ClassGroup, UUID> {
}
