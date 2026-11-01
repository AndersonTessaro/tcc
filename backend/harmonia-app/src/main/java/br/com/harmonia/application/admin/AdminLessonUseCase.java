package br.com.harmonia.application.admin;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.lesson.port.LessonRepository;
import br.com.harmonia.application.profile.port.TeacherRepository;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import br.com.harmonia.lessoncore.DomainValidationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class AdminLessonUseCase {
    private final LessonRepository lessons;
    private final TeacherRepository teachers;
    private final CurrentUserService current;

    public AdminLessonUseCase(LessonRepository lessons, TeacherRepository teachers, CurrentUserService current) {
        this.lessons = lessons;
        this.teachers = teachers;
        this.current = current;
    }

    @Transactional(readOnly = true)
    public List<Lesson> list(UUID teacherId, LocalDate from, LocalDate to) {
        if (to.isBefore(from) || to.isAfter(from.plusDays(366)))
            throw new DomainValidationException("Lesson period must contain at most 366 days");
        if (teacherId != null) current.assertSchool(teachers.findById(teacherId)
            .orElseThrow(() -> new ResourceNotFoundException("Teacher")).getUser().getSchoolId());
        List<Lesson> found = teacherId == null ? lessons.findByDateBetween(from, to)
            : lessons.findByEnrollmentTeacherIdAndDateBetween(teacherId, from, to);
        return found.stream().filter(l -> current.canManageSchool(l.getEnrollment().getTeacher().getUser().getSchoolId())
                && current.canManageSchool(l.getEnrollment().getStudent().getUser().getSchoolId()))
            .sorted(Comparator.comparing(Lesson::getDate).thenComparing(Lesson::getStartTime)).toList();
    }
}
