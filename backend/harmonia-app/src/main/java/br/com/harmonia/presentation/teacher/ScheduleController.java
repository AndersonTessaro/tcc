package br.com.harmonia.presentation.teacher;

import br.com.harmonia.application.schedule.ScheduleUseCase;
import br.com.harmonia.infrastructure.persistence.schedule.Weekday;
import br.com.harmonia.presentation.response.ScheduleResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/teacher/schedules")
public class ScheduleController {
    private final ScheduleUseCase uc;

    public ScheduleController(ScheduleUseCase uc) {
        this.uc = uc;
    }

    public record NewSchedule(@NotNull UUID enrollmentId, @NotNull Weekday weekday,
                              @NotNull LocalTime startTime, @NotNull LocalTime endTime) {}
    public record ChangeScheduleStatus(@NotNull Boolean active) {}

    @GetMapping
    @PreAuthorize("hasAuthority('lesson.read')")
    public List<ScheduleResponse> list() {
        return uc.mySchedules().stream().map(ScheduleResponse::of).toList();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('lesson.manage')")
    public ScheduleResponse create(@Valid @RequestBody NewSchedule r) {
        return ScheduleResponse.of(uc.create(r.enrollmentId(), r.weekday(), r.startTime(), r.endTime()));
    }

    @PatchMapping("/{id}/active")
    @PreAuthorize("hasAuthority('lesson.manage')")
    public ScheduleResponse setActive(@PathVariable UUID id, @Valid @RequestBody ChangeScheduleStatus r) {
        return ScheduleResponse.of(uc.setActive(id, r.active()));
    }
}
