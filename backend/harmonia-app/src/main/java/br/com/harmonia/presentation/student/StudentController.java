package br.com.harmonia.presentation.student;

import br.com.harmonia.application.lesson.StudentLessonUseCase;
import br.com.harmonia.application.student.StudentNoteUseCase;
import br.com.harmonia.presentation.response.SharedNoteResponse;
import br.com.harmonia.application.gamification.GoalUseCase;
import br.com.harmonia.application.gamification.PracticeUseCase;
import br.com.harmonia.application.gamification.PracticeRecordingUseCase;
import br.com.harmonia.application.gamification.ProgressUseCase;
import br.com.harmonia.application.material.StudentMaterialUseCase;
import br.com.harmonia.domain.gamification.GamificationService;
import br.com.harmonia.infrastructure.persistence.gamification.GoalStatus;
import br.com.harmonia.infrastructure.persistence.gamification.GoalType;
import br.com.harmonia.infrastructure.persistence.gamification.Progress;
import br.com.harmonia.infrastructure.persistence.lesson.AttendanceStatus;
import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import br.com.harmonia.infrastructure.persistence.lesson.LessonStatus;
import br.com.harmonia.presentation.response.LessonDetailResponse;
import br.com.harmonia.presentation.response.GoalResponse;
import br.com.harmonia.presentation.response.LessonResponse;
import br.com.harmonia.presentation.response.MaterialResponse;
import br.com.harmonia.presentation.response.ProgressResponse;
import br.com.harmonia.presentation.response.PracticeResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/me")
public class StudentController {
    private final ProgressUseCase progress;
    private final PracticeUseCase practice;
    private final PracticeRecordingUseCase recording;
    private final GoalUseCase goal;
    private final StudentLessonUseCase lesson;
    private final StudentMaterialUseCase material;
    private final StudentNoteUseCase notes;
    private final GamificationService gamification = new GamificationService();

    public StudentController(ProgressUseCase progress, PracticeUseCase practice, GoalUseCase goal,
                            StudentLessonUseCase lesson, StudentMaterialUseCase material,
                            PracticeRecordingUseCase recording, StudentNoteUseCase notes) {
        this.progress = progress;
        this.practice = practice;
        this.goal = goal;
        this.lesson = lesson;
        this.material = material;
        this.recording = recording;
        this.notes = notes;
    }

    public record RegisterPractice(@Min(1) int durationMin, LocalDate date, @Size(max = 500) String notes,
                                   @Size(max = 255) String difficulty, @Min(1) @Max(5) Integer rating) {}
    public record AttendanceResponse(LocalDate date, AttendanceStatus status) {}
    public record NewGoal(@NotBlank String title, String description, @NotNull GoalType type, @Min(1) int target) {}

    @GetMapping("/teacher-notes")
    @PreAuthorize("hasAuthority('note.read')")
    public List<SharedNoteResponse> teacherNotes() {
        return notes.sharedWithMe().stream().map(SharedNoteResponse::of).toList();
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('progress.read')")
    public Map<String, Object> dashboard() {
        Progress p = progress.myProgress();
        var nextLesson = lesson.myLessons(true).stream()
            .filter(item -> item.getStatus() == LessonStatus.SCHEDULED)
            .filter(item -> item.getDate().isAfter(LocalDate.now()) || item.getStartTime().isAfter(LocalTime.now()))
            .min(Comparator.comparing(Lesson::getDate).thenComparing(Lesson::getStartTime));
        Map<String, Object> body = new HashMap<>();
        body.put("xp", p.getXpTotal());
        body.put("level", p.getLevel());
        body.put("levelStartXp", gamification.xpToReachLevel(p.getLevel()));
        body.put("nextLevelXp", gamification.xpToReachLevel(p.getLevel() + 1));
        body.put("streakDays", p.getStreakDays());
        body.put("weeklyPracticeMin", practice.weeklyPracticeMin(p.getStudent().getId()));
        body.put("nextLesson", nextLesson.map(LessonResponse::of).orElse(null));
        return body;
    }

    @GetMapping("/lessons")
    @PreAuthorize("hasAuthority('lesson.read')")
    public List<LessonResponse> lessons(@RequestParam(defaultValue = "upcoming") String status) {
        return lesson.myLessons("upcoming".equals(status)).stream().map(LessonResponse::of).toList();
    }

    @GetMapping("/lessons/{id}")
    @PreAuthorize("hasAuthority('lesson.read')")
    public LessonDetailResponse lessonDetail(@PathVariable UUID id) {
        return LessonDetailResponse.of(lesson.detail(id), lesson.attachments(id));
    }

    @GetMapping("/materials")
    @PreAuthorize("hasAuthority('material.read')")
    public List<MaterialResponse> materials(@RequestParam(required = false) String search) {
        return material.list(search).stream().map(MaterialResponse::of).toList();
    }

    @GetMapping("/materials/{id}/download")
    @PreAuthorize("hasAuthority('material.read')")
    public ResponseEntity<byte[]> download(@PathVariable UUID id) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM).body(material.download(id));
    }

    @PostMapping("/practices")
    @PreAuthorize("hasAuthority('practice.register')")
    public ProgressResponse registerPractice(@Valid @RequestBody RegisterPractice r) {
        return ProgressResponse.of(practice.register(r.durationMin(), r.date() == null ? LocalDate.now() : r.date(),
            r.notes(), r.difficulty(), r.rating()));
    }

    @PostMapping(value = "/practices/{id}/recording", consumes = "multipart/form-data")
    @PreAuthorize("hasAuthority('practice.register')")
    public PracticeResponse uploadRecording(@PathVariable UUID id, @RequestParam MultipartFile file) {
        return PracticeResponse.of(recording.attach(id, file));
    }

    @GetMapping("/practices/{id}/recording")
    @PreAuthorize("hasAuthority('progress.read')")
    public ResponseEntity<byte[]> downloadRecording(@PathVariable UUID id) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM).body(recording.downloadMine(id));
    }

    @GetMapping("/practices")
    @PreAuthorize("hasAuthority('progress.read')")
    public List<PracticeResponse> practices() {
        return practice.myPractices().stream().map(PracticeResponse::of).toList();
    }

    @GetMapping("/progress")
    @PreAuthorize("hasAuthority('progress.read')")
    public Progress progress() {
        return progress.myProgress();
    }

    @GetMapping("/attendance")
    @PreAuthorize("hasAuthority('progress.read')")
    public List<AttendanceResponse> attendance() {
        return progress.myAttendance().stream()
            .map(item -> new AttendanceResponse(item.getLesson().getDate(), item.getStatus()))
            .toList();
    }

    @GetMapping("/goals")
    @PreAuthorize("hasAuthority('goal.read')")
    public List<GoalResponse> goals(@RequestParam(required = false) GoalStatus status) {
        return goal.list(status).stream().map(GoalResponse::of).toList();
    }

    @PostMapping("/goals")
    @PreAuthorize("hasAuthority('goal.manage')")
    public GoalResponse createGoal(@Valid @RequestBody NewGoal r) {
        return GoalResponse.of(goal.create(r.title(), r.description(), r.type(), r.target()));
    }

    @PutMapping("/goals/{id}")
    @PreAuthorize("hasAuthority('goal.manage')")
    public GoalResponse updateGoalProgress(@PathVariable UUID id, @RequestParam @Min(0) int progress) {
        return GoalResponse.of(goal.updateProgress(id, progress));
    }
}
