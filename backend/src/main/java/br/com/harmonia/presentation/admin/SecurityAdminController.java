package br.com.harmonia.presentation.admin;

import br.com.harmonia.application.admin.SecurityAdminUseCase;
import br.com.harmonia.infrastructure.persistence.security.Permission;
import br.com.harmonia.infrastructure.persistence.security.Role;
import br.com.harmonia.infrastructure.persistence.security.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/admin/security")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('auth.user.manage') or hasAuthority('auth.role.manage')")
public class SecurityAdminController {
    private final SecurityAdminUseCase uc;

    public SecurityAdminController(SecurityAdminUseCase uc) {
        this.uc = uc;
    }

    public record SetRoles(@NotNull Set<Long> roleIds) {}
    public record SetStatus(boolean active) {}
    public record ResetPassword(@NotBlank @Size(min = 8) String newPassword) {}
    public record SetPermissions(@NotNull Set<Long> permissionIds) {}
    public record NewRole(@NotBlank String name, @NotBlank String description) {}

    @GetMapping("/users")
    public List<User> users() {
        return uc.listUsers();
    }

    @GetMapping("/roles")
    public List<Role> roles() {
        return uc.listRoles();
    }

    @GetMapping("/permissions")
    public List<Permission> permissions() {
        return uc.listPermissions();
    }

    @PutMapping("/users/{id}/roles")
    @PreAuthorize("hasAuthority('auth.user.manage')")
    public User setRoles(@PathVariable UUID id, @Valid @RequestBody SetRoles r) {
        return uc.setRoles(id, r.roleIds());
    }

    @PutMapping("/users/{id}/status")
    @PreAuthorize("hasAuthority('auth.user.manage')")
    public void setStatus(@PathVariable UUID id, @RequestBody SetStatus r) {
        uc.setStatus(id, r.active());
    }

    @PutMapping("/users/{id}/password")
    @PreAuthorize("hasAuthority('auth.user.manage')")
    public void resetPassword(@PathVariable UUID id, @Valid @RequestBody ResetPassword r) {
        uc.resetPassword(id, r.newPassword());
    }

    @PostMapping("/roles")
    @PreAuthorize("hasAuthority('auth.role.manage')")
    public Role createRole(@Valid @RequestBody NewRole r) {
        return uc.createRole(r.name(), r.description());
    }

    @PutMapping("/roles/{id}/permissions")
    @PreAuthorize("hasAuthority('auth.role.manage')")
    public Role setPermissions(@PathVariable Long id, @Valid @RequestBody SetPermissions r) {
        return uc.setRolePermissions(id, r.permissionIds());
    }
}
