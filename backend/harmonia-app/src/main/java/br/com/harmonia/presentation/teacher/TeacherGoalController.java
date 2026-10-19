package br.com.harmonia.presentation.teacher;

import br.com.harmonia.application.gamification.GoalUseCase;
import br.com.harmonia.domain.gamification.GoalPeriod;
import br.com.harmonia.infrastructure.persistence.gamification.GoalStatus;
import br.com.harmonia.infrastructure.persistence.gamification.GoalType;
import br.com.harmonia.presentation.response.GoalResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/teacher/students/{studentId}/goals")
public class TeacherGoalController {
    private final GoalUseCase goals;

    public TeacherGoalController(GoalUseCase goals) {
        this.goals = goals;
    }

    public record NewGoal(@NotBlank @Size(max = 150) String title, @Size(max = 500) String description,
                          @NotNull GoalType type, @NotNull GoalPeriod period, @Min(1) int target) {}

    @GetMapping
    @PreAuthorize("hasAuthority('goal.read')")
    public List<GoalResponse> list(@PathVariable UUID studentId, @RequestParam(required = false) GoalStatus status) {
        return goals.listForStudent(studentId, status).stream().map(GoalResponse::of).toList();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('goal.manage')")
    public GoalResponse create(@PathVariable UUID studentId, @Valid @RequestBody NewGoal r) {
        return GoalResponse.of(goals.createForStudent(studentId,
            new GoalUseCase.NewGoal(r.title(), r.description(), r.type(), r.period(), r.target())));
    }

    @PatchMapping("/{goalId}/end")
    @PreAuthorize("hasAuthority('goal.manage')")
    public GoalResponse end(@PathVariable UUID studentId, @PathVariable UUID goalId) {
        return GoalResponse.of(goals.endForStudent(studentId, goalId));
    }
}
