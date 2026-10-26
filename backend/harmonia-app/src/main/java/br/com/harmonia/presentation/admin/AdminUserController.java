package br.com.harmonia.presentation.admin;

import br.com.harmonia.application.admin.SecurityAdminUseCase;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class AdminUserController {
    private final SecurityAdminUseCase users;

    public AdminUserController(SecurityAdminUseCase users) {
        this.users = users;
    }

    @DeleteMapping("/admin/users/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('auth.user.manage')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        users.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
