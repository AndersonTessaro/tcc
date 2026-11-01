package br.com.harmonia.application.admin;

import br.com.harmonia.application.admin.port.UserStorageRepository;
import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.storage.StorageTransactions;
import br.com.harmonia.domain.common.DuplicateResourceException;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.infrastructure.storage.FileStoragePort;
import br.com.harmonia.application.security.port.PermissionRepository;
import br.com.harmonia.application.security.port.RoleRepository;
import br.com.harmonia.application.security.port.UserRepository;
import br.com.harmonia.infrastructure.persistence.security.Permission;
import br.com.harmonia.infrastructure.persistence.security.Role;
import br.com.harmonia.infrastructure.persistence.security.User;
import br.com.harmonia.infrastructure.security.TokenService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.access.AccessDeniedException;
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
    private final CurrentUserService current;
    private final UserStorageRepository userStorage;
    private final FileStoragePort storage;

    public SecurityAdminUseCase(UserRepository users, RoleRepository roles,
                                PermissionRepository permissions, PasswordEncoder encoder,
                                TokenService tokenService, CurrentUserService current,
                                UserStorageRepository userStorage, FileStoragePort storage) {
        this.users = users;
        this.roles = roles;
        this.permissions = permissions;
        this.encoder = encoder;
        this.tokenService = tokenService;
        this.current = current;
        this.userStorage = userStorage;
        this.storage = storage;
    }

    @Transactional
    public void deleteUser(UUID userId) {
        User user = scopedUser(userId);
        if (current.userId().equals(userId)) throw new DuplicateResourceException("Cannot delete your own account");
        if (user.getRoles().stream().anyMatch(role -> "ADMIN".equals(role.getName())))
            throw new DuplicateResourceException("Cannot delete an administrator");
        var paths = userStorage.pathsForUser(userId);
        users.delete(user);
        paths.forEach(path -> StorageTransactions.deleteAfterCommit(storage, path));
    }

    public List<User> listUsers() {
        return users.findAll().stream().filter(u -> current.canManageSchool(u.getSchoolId())).toList();
    }

    public List<Role> listRoles() {
        return roles.findAll();
    }

    public List<Permission> listPermissions() {
        return permissions.findAll();
    }

    @Transactional
    public User setRoles(UUID userId, Set<Long> roleIds) {
        User u = scopedUser(userId);
        var assigned = new LinkedHashSet<>(roles.findAllById(roleIds));
        if (!current.isSystemAdmin() && assigned.stream().anyMatch(this::privileged))
            throw new AccessDeniedException("Cannot assign administrative roles");
        u.setRoles(assigned);
        if (assigned.stream().anyMatch(r -> "ADMIN".equals(r.getName()))) u.setSchoolId(null);
        return users.save(u);
    }

    @Transactional
    public void setStatus(UUID userId, boolean active) {
        User u = scopedUser(userId);
        u.setActive(active);
        users.save(u);
        if (!active) tokenService.revokeAllForUser(userId);
    }

    @Transactional
    public void resetPassword(UUID userId, String newPassword) {
        User u = scopedUser(userId);
        u.setPassword(encoder.encode(newPassword));
        users.save(u);
        tokenService.revokeAllForUser(userId);
    }

    private User scopedUser(UUID id) {
        User user = users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User"));
        current.assertSchool(user.getSchoolId());
        if (!current.isSystemAdmin() && user.getRoles().stream().anyMatch(this::privileged))
            throw new AccessDeniedException("Cannot change administrative accounts");
        return user;
    }

    private boolean privileged(Role role) {
        return Set.of("ADMIN", "MANAGER").contains(role.getName()) || role.getPermissions().stream()
            .anyMatch(p -> Set.of("school.manage", "auth.role.manage", "auth.permission.manage", "config.manage",
                "instrument.manage").contains(p.getName()));
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
