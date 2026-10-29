package br.com.harmonia.presentation.teacher;

import br.com.harmonia.application.gamification.PracticeRecordingUseCase;
import br.com.harmonia.application.lesson.AttendanceUseCase;
import br.com.harmonia.application.lesson.LessonAttachmentUseCase;
import br.com.harmonia.application.lesson.TeacherLessonUseCase;
import br.com.harmonia.application.material.TeacherMaterialUseCase;
import br.com.harmonia.application.teacher.TeacherReportUseCase;
import br.com.harmonia.application.teacher.TeacherUseCase;
import br.com.harmonia.domain.report.ReportPeriod;
import br.com.harmonia.presentation.response.EnrollmentOption;
import br.com.harmonia.presentation.response.AttendanceResponse;
import br.com.harmonia.presentation.response.AttachmentResponse;
import br.com.harmonia.presentation.response.AvailabilityResponse;
import br.com.harmonia.presentation.response.LessonResponse;
import br.com.harmonia.presentation.response.LessonDetailResponse;
import br.com.harmonia.presentation.response.MaterialResponse;
import br.com.harmonia.presentation.response.PersonSummary;
import br.com.harmonia.presentation.response.PracticeResponse;
import br.com.harmonia.infrastructure.persistence.lesson.AttendanceStatus;
import br.com.harmonia.infrastructure.persistence.lesson.LessonStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
    private final PracticeRecordingUseCase recording;
    private final LessonAttachmentUseCase attachments;
    private final TeacherReportUseCase reports;

    public TeacherController(TeacherUseCase teacher, TeacherLessonUseCase lesson,
                             AttendanceUseCase attendance, TeacherMaterialUseCase material,
                             PracticeRecordingUseCase recording, LessonAttachmentUseCase attachments,
                             TeacherReportUseCase reports) {
        this.teacher = teacher;
        this.lesson = lesson;
        this.attendance = attendance;
        this.material = material;
        this.recording = recording;
        this.attachments = attachments;
        this.reports = reports;
    }

    public record NewLesson(@NotNull UUID enrollmentId, @NotNull LocalDate date,
                            @NotNull LocalTime startTime, @NotNull LocalTime endTime,
                            @Size(max = 1000) String content, @Size(max = 1000) String homework) {}
    public record UpdateLesson(@NotNull LocalDate date, @NotNull LocalTime startTime, @NotNull LocalTime endTime,
                               @Size(max = 1000) String content, @Size(max = 1000) String homework) {}
    public record RegisterAttendance(@NotNull AttendanceStatus status, String justification) {}
    public record ChangeLessonStatus(@NotNull LessonStatus status) {}

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('student.read')")
    public Map<String, Object> dashboard(@RequestParam(required = false) String className) {
        var summary = teacher.dashboard(className);
        var statuses = lesson.attendanceByLesson(summary.todayLessons());
        return Map.of(
            "totalStudents", summary.totalStudents(),
            "attendancePercent", summary.attendancePercent(),
            "attendanceRecorded", summary.attendanceRecorded(),
            "weeklyPracticeMin", summary.weeklyPracticeMin(),
            "classes", summary.classes(),
            "selectedClass", summary.selectedClass(),
            "todayLessons", summary.todayLessons().stream().map(l -> LessonResponse.of(l, statuses.get(l.getId()))).toList(),
            "upcomingLessons", summary.upcomingLessons().stream().map(LessonResponse::of).toList());
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

    @GetMapping("/students/{id}/practices")
    @PreAuthorize("hasAuthority('student.read')")
    public List<PracticeResponse> studentPractices(@PathVariable UUID id) {
        return teacher.studentPractices(id).stream().map(PracticeResponse::of).toList();
    }

    @GetMapping("/practices/{id}/recording")
    @PreAuthorize("hasAuthority('student.read')")
    public ResponseEntity<byte[]> downloadPracticeRecording(@PathVariable UUID id) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM).body(recording.downloadAsTeacher(id));
    }

    @GetMapping("/students/{id}/lessons")
    @PreAuthorize("hasAuthority('student.read')")
    public List<LessonResponse> studentLessons(@PathVariable UUID id) {
        var studentLessons = teacher.studentLessons(id);
        var statuses = lesson.attendanceByLesson(studentLessons);
        return studentLessons.stream().map(l -> LessonResponse.of(l, statuses.get(l.getId()))).toList();
    }

    @PostMapping("/lessons")
    @PreAuthorize("hasAuthority('lesson.manage')")
    public LessonResponse newLesson(@Valid @RequestBody NewLesson r) {
        return LessonResponse.of(lesson.register(r.enrollmentId(), r.date(), r.startTime(), r.endTime(),
            r.content(), r.homework()));
    }

    @GetMapping("/lessons/{id}")
    @PreAuthorize("hasAuthority('lesson.read')")
    public LessonDetailResponse lessonDetail(@PathVariable UUID id) {
        var detail = lesson.detail(id);
        return LessonDetailResponse.of(detail.lesson(), detail.attachments());
    }

    @PostMapping(value = "/lessons/{id}/attachments", consumes = "multipart/form-data")
    @PreAuthorize("hasAuthority('lesson.manage')")
    public AttachmentResponse uploadLessonAttachment(@PathVariable UUID id, @RequestParam MultipartFile file) {
        return AttachmentResponse.of(attachments.upload(id, file));
    }

    @DeleteMapping("/lessons/{id}/attachments/{attachmentId}")
    @PreAuthorize("hasAuthority('lesson.manage')")
    public ResponseEntity<Void> deleteLessonAttachment(@PathVariable UUID id, @PathVariable UUID attachmentId) {
        attachments.delete(id, attachmentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/lessons/{id}/attachments/{attachmentId}")
    @PreAuthorize("hasAuthority('lesson.read')")
    public ResponseEntity<byte[]> downloadLessonAttachment(@PathVariable UUID id, @PathVariable UUID attachmentId) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM)
            .body(attachments.downloadAsTeacher(id, attachmentId));
    }

    @PutMapping("/lessons/{id}")
    @PreAuthorize("hasAuthority('lesson.manage')")
    public LessonResponse updateLesson(@PathVariable UUID id, @Valid @RequestBody UpdateLesson r) {
        return LessonResponse.of(lesson.update(id, r.date(), r.startTime(), r.endTime(), r.content(), r.homework()));
    }

    @GetMapping("/lessons/availability")
    @PreAuthorize("hasAuthority('lesson.manage')")
    public AvailabilityResponse availability(@RequestParam UUID enrollmentId,
                                             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                             @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime startTime,
                                             @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime endTime,
                                             @RequestParam(required = false) UUID lessonId) {
        return AvailabilityResponse.of(lesson.availability(enrollmentId, date, startTime, endTime, lessonId));
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

    @GetMapping("/students/{id}/materials")
    @PreAuthorize("hasAuthority('student.read')")
    public List<MaterialResponse> studentMaterials(@PathVariable UUID id) {
        return material.forStudent(id).stream().map(MaterialResponse::of).toList();
    }

    @GetMapping("/materials/{id}/download")
    @PreAuthorize("hasAuthority('student.read')")
    public ResponseEntity<byte[]> downloadMaterial(@PathVariable UUID id) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM).body(material.download(id));
    }

    @GetMapping("/schedule")
    @PreAuthorize("hasAuthority('lesson.read')")
    public List<LessonResponse> schedule(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        var dayLessons = lesson.scheduleForDay(date);
        var attendance = lesson.attendanceByLesson(dayLessons);
        return dayLessons.stream().map(l -> LessonResponse.of(l, attendance.get(l.getId()))).toList();
    }

    @GetMapping("/reports")
    @PreAuthorize("hasAuthority('report.read')")
    public Object reports(@RequestParam UUID studentId) {
        return teacher.studentDetail(studentId);
    }

    @GetMapping("/reports/attendance")
    @PreAuthorize("hasAuthority('report.read')")
    public TeacherReportUseCase.AttendanceReport attendanceReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reports.attendance(ReportPeriod.of(from, to, LocalDate.now()));
    }

    @GetMapping("/reports/practice")
    @PreAuthorize("hasAuthority('report.read')")
    public TeacherReportUseCase.PracticeReport practiceReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reports.practice(ReportPeriod.of(from, to, LocalDate.now()));
    }

    @GetMapping("/reports/classes")
    @PreAuthorize("hasAuthority('report.read')")
    public TeacherReportUseCase.ClassReport classReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reports.classes(ReportPeriod.of(from, to, LocalDate.now()));
    }
}
