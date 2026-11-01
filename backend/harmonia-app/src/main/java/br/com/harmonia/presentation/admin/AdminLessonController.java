package br.com.harmonia.presentation.admin;

import br.com.harmonia.application.admin.AdminLessonUseCase;
import br.com.harmonia.application.lesson.TeacherLessonUseCase;
import br.com.harmonia.presentation.response.LessonResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
public class AdminLessonController {
    private final AdminLessonUseCase agenda;
    private final TeacherLessonUseCase lessons;

    public AdminLessonController(AdminLessonUseCase agenda, TeacherLessonUseCase lessons) {
        this.agenda = agenda;
        this.lessons = lessons;
    }

    @GetMapping("/admin/lessons")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER') and hasAuthority('lesson.read')")
    public List<LessonResponse> list(@RequestParam(required = false) UUID teacherId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        var found = agenda.list(teacherId, from, to);
        var attendance = lessons.attendanceByLesson(found);
        return found.stream().map(l -> LessonResponse.of(l, attendance.get(l.getId()))).toList();
    }
}
