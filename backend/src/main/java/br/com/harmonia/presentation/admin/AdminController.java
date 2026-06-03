package br.com.harmonia.presentation.admin;

import br.com.harmonia.application.admin.AdminRegistrationUseCase;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/admin")
public class AdminController {
    private final AdminRegistrationUseCase uc;

    public AdminController(AdminRegistrationUseCase uc) {
        this.uc = uc;
    }

    public record NewUser(@NotBlank String username, @Email String email,
                          @NotBlank @Size(min = 8) String password, @NotBlank String name) {}
    public record NewInstrument(@NotBlank String name) {}
    public record NewEnrollment(@NotNull UUID studentId, @NotNull UUID teacherId, @NotNull UUID instrumentId) {}

    @PostMapping("/students")
    @PreAuthorize("hasAuthority('student.manage')")
    public Map<String, UUID> student(@Valid @RequestBody NewUser r) {
        return Map.of("id", uc.createStudent(r.username(), r.email(), r.password(), r.name()));
    }

    @PostMapping("/teachers")
    @PreAuthorize("hasAuthority('teacher.manage')")
    public Map<String, UUID> teacher(@Valid @RequestBody NewUser r) {
        return Map.of("id", uc.createTeacher(r.username(), r.email(), r.password(), r.name()));
    }

    @PostMapping("/instruments")
    @PreAuthorize("hasAuthority('instrument.manage')")
    public Map<String, UUID> instrument(@Valid @RequestBody NewInstrument r) {
        return Map.of("id", uc.createInstrument(r.name()));
    }

    @PostMapping("/enrollments")
    @PreAuthorize("hasAuthority('enrollment.manage')")
    public Map<String, UUID> enrollment(@Valid @RequestBody NewEnrollment r) {
        return Map.of("id", uc.createEnrollment(r.studentId(), r.teacherId(), r.instrumentId()));
    }
}
