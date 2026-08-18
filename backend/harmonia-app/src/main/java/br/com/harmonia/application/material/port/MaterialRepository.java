package br.com.harmonia.application.material.port;

import br.com.harmonia.infrastructure.persistence.material.Material;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MaterialRepository extends JpaRepository<Material, UUID> {
    List<Material> findByStudentId(UUID studentId);
    List<Material> findByStudentIdAndTitleContainingIgnoreCase(UUID studentId, String search);
}
