package br.com.harmonia.presentation.admin;

import br.com.harmonia.application.admin.AdminRegistrationUseCase;
import br.com.harmonia.infrastructure.persistence.profile.Instrument;
import br.com.harmonia.infrastructure.persistence.profile.Teacher;
import br.com.harmonia.presentation.response.PersonSummary;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/admin")
public class AdminController {
    private final AdminRegistrationUseCase uc;

    public AdminController(AdminRegistrationUseCase uc) {
        this.uc = uc;
    }

    // BCrypt silently truncates passwords past 72 bytes.
    private static boolean fitsBcrypt(String password) {
        return password == null || password.getBytes(StandardCharsets.UTF_8).length <= 72;
    }

    public record NewUser(@NotBlank @Size(max = 100) String username,
                          @NotBlank @Email @Size(max = 255) String email,
                          @NotBlank @Size(min = 8) String password,
                          @NotBlank @Size(max = 150) String name) {
        @AssertTrue(message = "password must contain at most 72 UTF-8 bytes")
        public boolean isPasswordWithinByteLimit() {
            return fitsBcrypt(password);
        }
    }
    public record NewTeacher(@NotBlank @Size(max = 100) String username,
                             @NotBlank @Email @Size(max = 255) String email,
                             @NotBlank @Size(min = 8) String password,
                             @NotBlank @Size(max = 150) String name,
                             List<@NotNull UUID> instrumentIds) {
        @AssertTrue(message = "password must contain at most 72 UTF-8 bytes")
        public boolean isPasswordWithinByteLimit() {
            return fitsBcrypt(password);
        }
    }
    public record TeacherInstruments(@NotNull List<@NotNull UUID> instrumentIds) {}
    public record TeacherOption(UUID id, String name, String username, List<InstrumentOption> instruments) {
        static TeacherOption of(Teacher teacher) {
            return new TeacherOption(teacher.getId(), teacher.getUser().nameForDisplay(),
                teacher.getUser().getUsername(),
                teacher.getInstruments().stream().map(InstrumentOption::of)
                    .sorted(java.util.Comparator.comparing(InstrumentOption::name)).toList());
        }
    }
    public record NewInstrument(@NotBlank @Size(max = 80) String name) {}
    public record NewEnrollment(@NotNull UUID studentId, @NotNull UUID teacherId, @NotNull UUID instrumentId) {}
    public record InstrumentOption(UUID id, String name) {
        static InstrumentOption of(Instrument instrument) {
            return new InstrumentOption(instrument.getId(), instrument.getName());
        }
    }

    @GetMapping("/students")
    @PreAuthorize("hasAnyAuthority('student.manage', 'enrollment.manage')")
    public List<PersonSummary> students() {
        return uc.activeStudents().stream().map(PersonSummary::of).toList();
    }

    @GetMapping("/teachers")
    @PreAuthorize("hasAnyAuthority('teacher.manage', 'enrollment.manage')")
    public List<TeacherOption> teachers() {
        return uc.activeTeachers().stream().map(TeacherOption::of).toList();
    }

    @PutMapping("/teachers/{id}/instruments")
    @PreAuthorize("hasAuthority('teacher.manage')")
    public TeacherOption teacherInstruments(@PathVariable UUID id, @Valid @RequestBody TeacherInstruments r) {
        return TeacherOption.of(uc.setTeacherInstruments(id, r.instrumentIds()));
    }

    @GetMapping("/instruments")
    @PreAuthorize("hasAnyAuthority('instrument.manage', 'enrollment.manage')")
    public List<InstrumentOption> instruments() {
        return uc.activeInstruments().stream().map(InstrumentOption::of).toList();
    }

    @PostMapping("/students")
    @PreAuthorize("hasAuthority('student.manage')")
    public Map<String, UUID> student(@Valid @RequestBody NewUser r) {
        return Map.of("id", uc.createStudent(r.username(), r.email(), r.password(), r.name()));
    }

    @PostMapping("/teachers")
    @PreAuthorize("hasAuthority('teacher.manage')")
    public Map<String, UUID> teacher(@Valid @RequestBody NewTeacher r) {
        return Map.of("id", uc.createTeacher(r.username(), r.email(), r.password(), r.name(), r.instrumentIds()));
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
