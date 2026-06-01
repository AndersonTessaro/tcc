package br.com.harmonia.application.admin;

import br.com.harmonia.application.security.port.PermissionRepository;
import br.com.harmonia.application.security.port.RoleRepository;
import br.com.harmonia.application.security.port.UsuarioRepository;
import br.com.harmonia.infrastructure.persistence.security.Permission;
import br.com.harmonia.infrastructure.persistence.security.Role;
import br.com.harmonia.infrastructure.persistence.security.Usuario;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;

@Service
public class SecurityAdminUseCase {
    private final UsuarioRepository usuarios;
    private final RoleRepository roles;
    private final PermissionRepository permissions;
    private final PasswordEncoder encoder;

    public SecurityAdminUseCase(UsuarioRepository usuarios, RoleRepository roles,
                                PermissionRepository permissions, PasswordEncoder encoder) {
        this.usuarios = usuarios;
        this.roles = roles;
        this.permissions = permissions;
        this.encoder = encoder;
    }

    public List<Usuario> listarUsuarios() {
        return usuarios.findAll();
    }

    public List<Role> listarRoles() {
        return roles.findAll();
    }

    public List<Permission> listarPermissoes() {
        return permissions.findAll();
    }

    @Transactional
    public Usuario definirRoles(UUID userId, Set<Long> roleIds) {
        Usuario u = usuarios.findById(userId).orElseThrow(() -> new NoSuchElementException("usuário"));
        u.setRoles(new LinkedHashSet<>(roles.findAllById(roleIds)));
        return usuarios.save(u);
    }

    @Transactional
    public void definirStatus(UUID userId, boolean ativo) {
        Usuario u = usuarios.findById(userId).orElseThrow(() -> new NoSuchElementException("usuário"));
        u.setAtivo(ativo);
        usuarios.save(u);
    }

    @Transactional
    public void resetarSenha(UUID userId, String novaSenha) {
        Usuario u = usuarios.findById(userId).orElseThrow(() -> new NoSuchElementException("usuário"));
        u.setPassword(encoder.encode(novaSenha));
        usuarios.save(u);
    }

    @Transactional
    public Role definirPermissoesDaRole(Long roleId, Set<Long> permIds) {
        Role r = roles.findById(roleId).orElseThrow(() -> new NoSuchElementException("role"));
        r.setPermissions(new LinkedHashSet<>(permissions.findAllById(permIds)));
        return roles.save(r);
    }

    @Transactional
    public Role criarRole(String name, String description) {
        Role r = new Role();
        r.setName(name);
        r.setDescription(description);
        return roles.save(r);
    }
}
