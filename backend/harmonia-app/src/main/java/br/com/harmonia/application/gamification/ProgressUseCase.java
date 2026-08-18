package br.com.harmonia.application.gamification;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.gamification.port.ProgressRepository;
import br.com.harmonia.infrastructure.persistence.gamification.Progress;
import org.springframework.stereotype.Service;

@Service
public class ProgressUseCase {
    private final ProgressRepository progresses;
    private final CurrentUserService current;

    public ProgressUseCase(ProgressRepository progresses, CurrentUserService current) {
        this.progresses = progresses;
        this.current = current;
    }

    public Progress myProgress() {
        var student = current.currentStudent();
        return progresses.findByStudentId(student.getId()).orElseGet(() -> {
            Progress p = new Progress();
            p.setStudent(student);
            return p;
        });
    }
}
