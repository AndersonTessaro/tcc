package br.com.harmonia.application.admin;

import br.com.harmonia.application.security.port.PermissionRepository;
import br.com.harmonia.application.security.port.RoleRepository;
import br.com.harmonia.application.security.port.UserRepository;
import br.com.harmonia.infrastructure.persistence.security.Permission;
import br.com.harmonia.infrastructure.persistence.security.Role;
import br.com.harmonia.infrastructure.persistence.security.User;
import br.com.harmonia.infrastructure.security.TokenService;
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
    private final UserRepository users;
    private final RoleRepository roles;
    private final PermissionRepository permissions;
    private final PasswordEncoder encoder;
    private final TokenService tokenService;

    public SecurityAdminUseCase(UserRepository users, RoleRepository roles,
                                PermissionRepository permissions, PasswordEncoder encoder,
                                TokenService tokenService) {
        this.users = users;
        this.roles = roles;
        this.permissions = permissions;
        this.encoder = encoder;
        this.tokenService = tokenService;
    }

    public List<User> listUsers() {
        return users.findAll();
    }

    public List<Role> listRoles() {
        return roles.findAll();
    }

    public List<Permission> listPermissions() {
        return permissions.findAll();
    }

    @Transactional
    public User setRoles(UUID userId, Set<Long> roleIds) {
        User u = users.findById(userId).orElseThrow(() -> new NoSuchElementException("user"));
        u.setRoles(new LinkedHashSet<>(roles.findAllById(roleIds)));
        return users.save(u);
    }

    @Transactional
    public void setStatus(UUID userId, boolean active) {
        User u = users.findById(userId).orElseThrow(() -> new NoSuchElementException("user"));
        u.setActive(active);
        users.save(u);
        if (!active) tokenService.revokeAllForUser(userId);
    }

    @Transactional
    public void resetPassword(UUID userId, String newPassword) {
        User u = users.findById(userId).orElseThrow(() -> new NoSuchElementException("user"));
        u.setPassword(encoder.encode(newPassword));
        users.save(u);
        tokenService.revokeAllForUser(userId);
    }

    @Transactional
    public Role setRolePermissions(Long roleId, Set<Long> permIds) {
        Role r = roles.findById(roleId).orElseThrow(() -> new NoSuchElementException("role"));
        r.setPermissions(new LinkedHashSet<>(permissions.findAllById(permIds)));
        return roles.save(r);
    }

    @Transactional
    public Role createRole(String name, String description) {
        Role r = new Role();
        r.setName(name);
        r.setDescription(description);
        return roles.save(r);
    }
}
