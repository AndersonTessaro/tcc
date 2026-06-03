package br.com.harmonia.application.lesson;

import br.com.harmonia.application.lesson.port.AttendanceRepository;
import br.com.harmonia.application.lesson.port.LessonRepository;
import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.gamification.port.ProgressRepository;
import br.com.harmonia.domain.common.OwnershipException;
import br.com.harmonia.domain.gamification.GamificationService;
import br.com.harmonia.infrastructure.persistence.lesson.Attendance;
import br.com.harmonia.infrastructure.persistence.lesson.AttendanceStatus;
import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import br.com.harmonia.infrastructure.persistence.gamification.Progress;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class AttendanceUseCase {
    private final AttendanceRepository attendances;
    private final LessonRepository lessons;
    private final ProgressRepository progresses;
    private final CurrentUserService current;
    private final GamificationService gamification = new GamificationService();

    public AttendanceUseCase(AttendanceRepository attendances, LessonRepository lessons,
                             ProgressRepository progresses, CurrentUserService current) {
        this.attendances = attendances;
        this.lessons = lessons;
        this.progresses = progresses;
        this.current = current;
    }

    @Transactional
    public Attendance register(UUID lessonId, AttendanceStatus status, String justification) {
        Lesson lesson = lessons.findById(lessonId).orElseThrow();
        if (!lesson.getEnrollment().getTeacher().getId().equals(current.currentTeacher().getId()))
            throw new OwnershipException("Lesson belongs to another teacher");
        Attendance a = attendances.findByLessonId(lessonId).orElseGet(Attendance::new);
        a.setLesson(lesson);
        a.setStatus(status);
        a.setJustification(justification);
        a.setRegisteredAt(LocalDateTime.now());
        Attendance saved = attendances.save(a);
        if (status == AttendanceStatus.PRESENT) {
            var student = lesson.getEnrollment().getStudent();
            Progress prog = progresses.findByStudentId(student.getId()).orElseGet(() -> {
                Progress np = new Progress();
                np.setStudent(student);
                return np;
            });
            prog.setXpTotal(prog.getXpTotal() + gamification.xpFromAttendance());
            prog.setLevel(gamification.level(prog.getXpTotal()));
            progresses.save(prog);
        }
        return saved;
    }
}
