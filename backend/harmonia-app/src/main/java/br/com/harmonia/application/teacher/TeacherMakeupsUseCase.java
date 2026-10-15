package br.com.harmonia.application.teacher;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.lesson.port.MakeupLessonRepository;
import br.com.harmonia.domain.report.ReportPeriod;
import br.com.harmonia.infrastructure.persistence.lesson.MakeupLesson;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class TeacherMakeupsUseCase {
    private final MakeupLessonRepository makeups;
    private final CurrentUserService current;

    public TeacherMakeupsUseCase(MakeupLessonRepository makeups, CurrentUserService current) {
        this.makeups = makeups;
        this.current = current;
    }

    public List<MakeupLesson> list(LocalDate from, LocalDate to) {
        var teacher = current.currentTeacher();
        var today = LocalDate.now();
        var period = new ReportPeriod(from == null ? today.minusDays(30) : from,
            to == null ? today.plusDays(60) : to);
        return makeups.findForTeacher(teacher.getId(), period.from(), period.to());
    }
}
