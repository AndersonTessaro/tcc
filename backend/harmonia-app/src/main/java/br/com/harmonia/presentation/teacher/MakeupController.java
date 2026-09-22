package br.com.harmonia.presentation.teacher;

import br.com.harmonia.application.lesson.MakeupUseCase;
import br.com.harmonia.presentation.response.MakeupResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@RestController
@RequestMapping("/teacher/lessons")
public class MakeupController {
    private final MakeupUseCase uc;

    public MakeupController(MakeupUseCase uc) {
        this.uc = uc;
    }

    public record NewMakeup(@NotNull LocalDate date, @NotNull LocalTime startTime,
                            @NotNull LocalTime endTime, String reason) {}

    @PostMapping("/{id}/makeup")
    @PreAuthorize("hasAuthority('lesson.manage')")
    public MakeupResponse create(@PathVariable UUID id, @Valid @RequestBody NewMakeup r) {
        return MakeupResponse.of(uc.create(id, r.date(), r.startTime(), r.endTime(), r.reason()));
    }
}
