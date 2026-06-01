package br.com.harmonia.presentation.admin;

import br.com.harmonia.application.admin.SecurityAdminUseCase;
import br.com.harmonia.infrastructure.persistence.security.Permission;
import br.com.harmonia.infrastructure.persistence.security.Role;
import br.com.harmonia.infrastructure.persistence.security.Usuario;
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
    public record SetStatus(boolean ativo) {}
    public record ResetSenha(@NotBlank @Size(min = 8) String novaSenha) {}
    public record SetPerms(@NotNull Set<Long> permissionIds) {}
    public record NovaRole(@NotBlank String name, @NotBlank String description) {}

    @GetMapping("/usuarios")
    public List<Usuario> usuarios() {
        return uc.listarUsuarios();
    }

    @GetMapping("/roles")
    public List<Role> roles() {
        return uc.listarRoles();
    }

    @GetMapping("/permissoes")
    public List<Permission> permissoes() {
        return uc.listarPermissoes();
    }

    @PutMapping("/usuarios/{id}/roles")
    @PreAuthorize("hasAuthority('auth.user.manage')")
    public Usuario setRoles(@PathVariable UUID id, @Valid @RequestBody SetRoles r) {
        return uc.definirRoles(id, r.roleIds());
    }

    @PutMapping("/usuarios/{id}/status")
    @PreAuthorize("hasAuthority('auth.user.manage')")
    public void setStatus(@PathVariable UUID id, @RequestBody SetStatus r) {
        uc.definirStatus(id, r.ativo());
    }

    @PutMapping("/usuarios/{id}/senha")
    @PreAuthorize("hasAuthority('auth.user.manage')")
    public void resetSenha(@PathVariable UUID id, @Valid @RequestBody ResetSenha r) {
        uc.resetarSenha(id, r.novaSenha());
    }

    @PostMapping("/roles")
    @PreAuthorize("hasAuthority('auth.role.manage')")
    public Role criarRole(@Valid @RequestBody NovaRole r) {
        return uc.criarRole(r.name(), r.description());
    }

    @PutMapping("/roles/{id}/permissoes")
    @PreAuthorize("hasAuthority('auth.role.manage')")
    public Role setPerms(@PathVariable Long id, @Valid @RequestBody SetPerms r) {
        return uc.definirPermissoesDaRole(id, r.permissionIds());
    }
}
