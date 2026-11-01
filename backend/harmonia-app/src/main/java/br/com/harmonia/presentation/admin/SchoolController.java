package br.com.harmonia.presentation.admin;

import br.com.harmonia.application.admin.AdminRegistrationUseCase;
import br.com.harmonia.application.admin.SchoolUseCase;
import br.com.harmonia.infrastructure.persistence.profile.School;
import br.com.harmonia.infrastructure.persistence.security.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/admin/schools")
@PreAuthorize("hasRole('ADMIN') and hasAuthority('school.manage')")
public class SchoolController {
    private final SchoolUseCase schools;
    private final AdminRegistrationUseCase registration;

    public SchoolController(SchoolUseCase schools, AdminRegistrationUseCase registration) {
        this.schools = schools;
        this.registration = registration;
    }

    public record NewSchool(@NotBlank @Size(max = 120) String name) {}
    public record UpdateSchool(@NotBlank @Size(max = 120) String name, @NotNull Boolean active) {}
    public record ManagerResponse(UUID id, String name, String username, String email, boolean active) {
        static ManagerResponse of(User user) {
            return new ManagerResponse(user.getId(), user.getDisplayName(), user.getUsername(), user.getEmail(),
                Boolean.TRUE.equals(user.getActive()));
        }
    }
    public record SchoolResponse(UUID id, String name, boolean active, LocalDateTime createdAt, List<ManagerResponse> managers) {
        static SchoolResponse of(School school, Map<UUID, List<User>> managers) {
            return new SchoolResponse(school.getId(), school.getName(), school.isActive(), school.getCreatedAt(),
                managers.getOrDefault(school.getId(), List.of()).stream().map(ManagerResponse::of).toList());
        }
    }

    @GetMapping
    public List<SchoolResponse> list() {
        var managers = schools.managersBySchool();
        return schools.list().stream().map(school -> SchoolResponse.of(school, managers)).toList();
    }

    @PostMapping
    public SchoolResponse create(@Valid @RequestBody NewSchool request) {
        return SchoolResponse.of(schools.create(request.name()), Map.of());
    }

    @PutMapping("/{id}")
    public SchoolResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateSchool request) {
        return SchoolResponse.of(schools.update(id, request.name(), request.active()), schools.managersBySchool());
    }

    @PostMapping("/{id}/managers")
    public Map<String, UUID> manager(@PathVariable UUID id, @Valid @RequestBody AdminController.NewUser request) {
        return Map.of("id", registration.createManager(id, request.username(), request.email(), request.password(), request.name()));
    }
}
