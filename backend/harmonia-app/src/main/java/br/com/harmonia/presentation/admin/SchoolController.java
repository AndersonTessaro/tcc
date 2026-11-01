package br.com.harmonia.presentation.admin;

import br.com.harmonia.application.admin.AdminRegistrationUseCase;
import br.com.harmonia.application.admin.SchoolUseCase;
import br.com.harmonia.infrastructure.persistence.profile.School;
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
    public record SchoolResponse(UUID id, String name, boolean active, LocalDateTime createdAt) {
        static SchoolResponse of(School school) {
            return new SchoolResponse(school.getId(), school.getName(), school.isActive(), school.getCreatedAt());
        }
    }

    @GetMapping
    public List<SchoolResponse> list() {
        return schools.list().stream().map(SchoolResponse::of).toList();
    }

    @PostMapping
    public SchoolResponse create(@Valid @RequestBody NewSchool request) {
        return SchoolResponse.of(schools.create(request.name()));
    }

    @PutMapping("/{id}")
    public SchoolResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateSchool request) {
        return SchoolResponse.of(schools.update(id, request.name(), request.active()));
    }

    @PostMapping("/{id}/managers")
    public Map<String, UUID> manager(@PathVariable UUID id, @Valid @RequestBody AdminController.NewUser request) {
        return Map.of("id", registration.createManager(id, request.username(), request.email(), request.password(), request.name()));
    }
}
