package br.com.harmonia.application.gamification;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.gamification.port.ProgressRepository;
import br.com.harmonia.application.lesson.port.AttendanceRepository;
import br.com.harmonia.infrastructure.persistence.gamification.Progress;
import br.com.harmonia.infrastructure.persistence.lesson.Attendance;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProgressUseCase {
    private final ProgressRepository progresses;
    private final CurrentUserService current;
    private final AttendanceRepository attendances;

    public ProgressUseCase(ProgressRepository progresses, CurrentUserService current,
                           AttendanceRepository attendances) {
        this.progresses = progresses;
        this.current = current;
        this.attendances = attendances;
    }

    public Progress myProgress() {
        var student = current.currentStudent();
        return progresses.findByStudentId(student.getId()).orElseGet(() -> {
            Progress p = new Progress();
            p.setStudent(student);
            return p;
        });
    }

    @Transactional(readOnly = true)
    public List<Attendance> myAttendance() {
        return attendances.findTop100ByLessonEnrollmentStudentIdOrderByLessonDateDesc(
            current.currentStudent().getId());
    }
}
