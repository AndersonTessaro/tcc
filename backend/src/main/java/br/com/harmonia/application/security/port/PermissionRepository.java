package br.com.harmonia.application.security.port;

import br.com.harmonia.infrastructure.persistence.security.Permission;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PermissionRepository extends JpaRepository<Permission, Long> {
}
