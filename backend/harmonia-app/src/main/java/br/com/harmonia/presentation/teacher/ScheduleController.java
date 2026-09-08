package br.com.harmonia.presentation.teacher;

import br.com.harmonia.application.schedule.ScheduleUseCase;
import br.com.harmonia.infrastructure.persistence.schedule.Schedule;
import br.com.harmonia.infrastructure.persistence.schedule.Weekday;
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

    @GetMapping
    @PreAuthorize("hasAuthority('lesson.read')")
    public List<Schedule> list() {
        return uc.mySchedules();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('lesson.manage')")
    public Schedule create(@Valid @RequestBody NewSchedule r) {
        return uc.create(r.enrollmentId(), r.weekday(), r.startTime(), r.endTime());
    }
}
