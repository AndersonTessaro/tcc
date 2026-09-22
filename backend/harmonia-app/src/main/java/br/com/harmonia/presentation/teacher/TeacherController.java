package br.com.harmonia.presentation.teacher;

import br.com.harmonia.application.lesson.AttendanceUseCase;
import br.com.harmonia.application.lesson.TeacherLessonUseCase;
import br.com.harmonia.application.material.TeacherMaterialUseCase;
import br.com.harmonia.application.teacher.TeacherUseCase;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.presentation.response.AttendanceResponse;
import br.com.harmonia.presentation.response.LessonResponse;
import br.com.harmonia.presentation.response.MaterialResponse;
import br.com.harmonia.presentation.response.PersonSummary;
import br.com.harmonia.infrastructure.persistence.lesson.AttendanceStatus;
import br.com.harmonia.infrastructure.persistence.lesson.LessonStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/teacher")
public class TeacherController {
    private final TeacherUseCase teacher;
    private final TeacherLessonUseCase lesson;
    private final AttendanceUseCase attendance;
    private final TeacherMaterialUseCase material;

    public TeacherController(TeacherUseCase teacher, TeacherLessonUseCase lesson,
                             AttendanceUseCase attendance, TeacherMaterialUseCase material) {
        this.teacher = teacher;
        this.lesson = lesson;
        this.attendance = attendance;
        this.material = material;
    }

    public record NewLesson(@NotNull UUID enrollmentId, @NotNull LocalDate date,
                            @NotNull LocalTime startTime, @NotNull LocalTime endTime,
                            String content, String homework) {}
    public record RegisterAttendance(@NotNull AttendanceStatus status, String justification) {}
    public record ChangeLessonStatus(@NotNull LessonStatus status) {}
    public record EnrollmentOption(UUID id, UUID studentId, String studentName, String instrument) {
        static EnrollmentOption of(Enrollment e) {
            return new EnrollmentOption(e.getId(), e.getStudent().getId(),
                e.getStudent().getUser().nameForDisplay(), e.getInstrument().getName());
        }
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('student.read')")
    public Map<String, Object> dashboard() {
        List<PersonSummary> students = teacher.linkedStudents().stream().map(PersonSummary::of).toList();
        return Map.of("totalStudents", students.size(), "students", students);
    }

    @GetMapping("/students")
    @PreAuthorize("hasAuthority('student.read')")
    public List<PersonSummary> students() {
        return teacher.linkedStudents().stream().map(PersonSummary::of).toList();
    }

    @GetMapping("/enrollments")
    @PreAuthorize("hasAuthority('student.read')")
    public List<EnrollmentOption> enrollments() {
        return teacher.myActiveEnrollments().stream().map(EnrollmentOption::of).toList();
    }

    @GetMapping("/students/{id}")
    @PreAuthorize("hasAuthority('student.read')")
    public Object studentDetail(@PathVariable UUID id) {
        return teacher.studentDetail(id);
    }

    @PostMapping("/lessons")
    @PreAuthorize("hasAuthority('lesson.manage')")
    public LessonResponse newLesson(@Valid @RequestBody NewLesson r) {
        return LessonResponse.of(lesson.register(r.enrollmentId(), r.date(), r.startTime(), r.endTime(),
            r.content(), r.homework()));
    }

    @GetMapping("/lessons")
    @PreAuthorize("hasAuthority('lesson.read')")
    public List<LessonResponse> history(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
                                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return lesson.history(start, end).stream().map(LessonResponse::of).toList();
    }

    @PatchMapping("/lessons/{id}/status")
    @PreAuthorize("hasAuthority('lesson.manage')")
    public LessonResponse changeLessonStatus(@PathVariable UUID id, @Valid @RequestBody ChangeLessonStatus r) {
        return LessonResponse.of(lesson.changeStatus(id, r.status()));
    }

    @PostMapping("/lessons/{id}/attendance")
    @PreAuthorize("hasAuthority('attendance.manage')")
    public AttendanceResponse registerAttendance(@PathVariable UUID id, @Valid @RequestBody RegisterAttendance r) {
        return AttendanceResponse.of(attendance.register(id, r.status(), r.justification()));
    }

    @PostMapping(value = "/students/{id}/materials", consumes = "multipart/form-data")
    @PreAuthorize("hasAuthority('material.manage')")
    public MaterialResponse attachMaterial(@PathVariable UUID id, @RequestParam String title,
                                   @RequestParam(required = false) String description,
                                   @RequestParam MultipartFile file) {
        return MaterialResponse.of(material.attach(id, title, description, file));
    }

    @GetMapping("/schedule")
    @PreAuthorize("hasAuthority('lesson.read')")
    public List<LessonResponse> schedule(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return lesson.scheduleForDay(date).stream().map(LessonResponse::of).toList();
    }

    @GetMapping("/reports")
    @PreAuthorize("hasAuthority('report.read')")
    public Object reports(@RequestParam UUID studentId) {
        return teacher.studentDetail(studentId);
    }
}
