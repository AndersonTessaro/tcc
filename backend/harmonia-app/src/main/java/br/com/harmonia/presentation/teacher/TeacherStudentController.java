package br.com.harmonia.presentation.teacher;

import br.com.harmonia.application.teacher.TeacherStudentUseCase;
import br.com.harmonia.application.teacher.TeacherStudentUseCase.NewStudentCommand;
import br.com.harmonia.presentation.response.InstrumentOption;
import br.com.harmonia.presentation.response.StudentProfileResponse;
import br.com.harmonia.presentation.validation.Passwords;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/teacher")
public class TeacherStudentController {
    private final TeacherStudentUseCase students;

    public TeacherStudentController(TeacherStudentUseCase students) {
        this.students = students;
    }

    public record NewStudent(@NotBlank @Size(max = 100) String username,
                             @NotBlank @Email @Size(max = 255) String email,
                             @NotBlank @Size(min = 8) String password,
                             @NotBlank @Size(max = 150) String name,
                             @Size(max = 20) @Pattern(regexp = "^[0-9()+\\- ]{8,20}$") String phone,
                             @NotNull UUID instrumentId, @Size(max = 1000) String privateNotes,
                             @Size(max = 1000) String sharedNotes) {
        @AssertTrue(message = "password must contain at most 72 UTF-8 bytes")
        public boolean isPasswordWithinByteLimit() {
            return Passwords.fitsBcrypt(password);
        }
    }
    public record UpdateStudent(@NotBlank @Size(max = 150) String name,
                                @Size(max = 20) @Pattern(regexp = "^[0-9()+\\- ]{8,20}$") String phone,
                                @Size(max = 1000) String privateNotes, @Size(max = 1000) String sharedNotes) {}

    @GetMapping("/instruments")
    @PreAuthorize("hasAuthority('student.register')")
    public List<InstrumentOption> instruments() {
        return students.myInstruments().stream().map(InstrumentOption::of).toList();
    }

    @PostMapping("/students")
    @PreAuthorize("hasAuthority('student.register')")
    public StudentProfileResponse register(@Valid @RequestBody NewStudent r) {
        UUID id = students.register(new NewStudentCommand(r.username(), r.email(), r.password(), r.name(), r.phone(),
            r.instrumentId(), r.privateNotes(), r.sharedNotes()));
        return StudentProfileResponse.of(students.profile(id));
    }

    @GetMapping("/students/{id}/profile")
    @PreAuthorize("hasAuthority('student.read')")
    public StudentProfileResponse profile(@PathVariable UUID id) {
        return StudentProfileResponse.of(students.profile(id));
    }

    @PutMapping("/students/{id}/profile")
    @PreAuthorize("hasAuthority('student.update')")
    public StudentProfileResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateStudent r) {
        return StudentProfileResponse.of(students.update(id, r.name(), r.phone(), r.privateNotes(), r.sharedNotes()));
    }
}
