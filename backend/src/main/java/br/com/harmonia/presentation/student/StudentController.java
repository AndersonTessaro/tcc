package br.com.harmonia.presentation.student;

import br.com.harmonia.application.lesson.StudentLessonUseCase;
import br.com.harmonia.application.gamification.GoalUseCase;
import br.com.harmonia.application.gamification.PracticeUseCase;
import br.com.harmonia.application.gamification.ProgressUseCase;
import br.com.harmonia.application.material.StudentMaterialUseCase;
import br.com.harmonia.infrastructure.persistence.gamification.Goal;
import br.com.harmonia.infrastructure.persistence.gamification.GoalStatus;
import br.com.harmonia.infrastructure.persistence.gamification.GoalType;
import br.com.harmonia.infrastructure.persistence.gamification.Progress;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/me")
public class StudentController {
    private final ProgressUseCase progress;
    private final PracticeUseCase practice;
    private final GoalUseCase goal;
    private final StudentLessonUseCase lesson;
    private final StudentMaterialUseCase material;

    public StudentController(ProgressUseCase progress, PracticeUseCase practice, GoalUseCase goal,
                            StudentLessonUseCase lesson, StudentMaterialUseCase material) {
        this.progress = progress;
        this.practice = practice;
        this.goal = goal;
        this.lesson = lesson;
        this.material = material;
    }

    public record RegisterPractice(@Min(1) int durationMin, LocalDate date, String notes) {}
    public record NewGoal(@NotBlank String title, String description, @NotNull GoalType type, @Min(1) int target) {}

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('progress.read')")
    public Map<String, Object> dashboard() {
        Progress p = progress.myProgress();
        var upcoming = lesson.myLessons(true);
        Map<String, Object> body = new HashMap<>();
        body.put("xp", p.getXpTotal());
        body.put("level", p.getLevel());
        body.put("streakDays", p.getStreakDays());
        body.put("weeklyPracticeMin", practice.weeklyPracticeMin(p.getStudent().getId()));
        body.put("nextLesson", upcoming.isEmpty() ? null : upcoming.get(upcoming.size() - 1));
        return body;
    }

    @GetMapping("/lessons")
    @PreAuthorize("hasAuthority('lesson.read')")
    public Object lessons(@RequestParam(defaultValue = "upcoming") String status) {
        return lesson.myLessons("upcoming".equals(status));
    }

    @GetMapping("/lessons/{id}")
    @PreAuthorize("hasAuthority('lesson.read')")
    public Map<String, Object> lessonDetail(@PathVariable UUID id) {
        return Map.of("lesson", lesson.detail(id), "attachments", lesson.attachments(id));
    }

    @GetMapping("/materials")
    @PreAuthorize("hasAuthority('material.read')")
    public Object materials(@RequestParam(required = false) String search) {
        return material.list(search);
    }

    @GetMapping("/materials/{id}/download")
    @PreAuthorize("hasAuthority('material.read')")
    public ResponseEntity<byte[]> download(@PathVariable UUID id) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM).body(material.download(id));
    }

    @PostMapping("/practices")
    @PreAuthorize("hasAuthority('practice.register')")
    public Progress registerPractice(@Valid @RequestBody RegisterPractice r) {
        return practice.register(r.durationMin(), r.date() == null ? LocalDate.now() : r.date(), r.notes());
    }

    @GetMapping("/progress")
    @PreAuthorize("hasAuthority('progress.read')")
    public Progress progress() {
        return progress.myProgress();
    }

    @GetMapping("/goals")
    @PreAuthorize("hasAuthority('goal.read')")
    public List<Goal> goals(@RequestParam(required = false) GoalStatus status) {
        return goal.list(status);
    }

    @PostMapping("/goals")
    @PreAuthorize("hasAuthority('goal.manage')")
    public Goal createGoal(@Valid @RequestBody NewGoal r) {
        return goal.create(r.title(), r.description(), r.type(), r.target());
    }

    @PutMapping("/goals/{id}")
    @PreAuthorize("hasAuthority('goal.manage')")
    public Goal updateGoalProgress(@PathVariable UUID id, @RequestParam int progress) {
        return goal.updateProgress(id, progress);
    }
}
