package br.com.harmonia.application.gamification;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.gamification.port.PracticeRepository;
import br.com.harmonia.application.gamification.port.ProgressRepository;
import br.com.harmonia.domain.gamification.GamificationService;
import br.com.harmonia.infrastructure.persistence.gamification.Practice;
import br.com.harmonia.infrastructure.persistence.gamification.Progress;
import br.com.harmonia.infrastructure.persistence.profile.Student;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class PracticeUseCase {
    private final PracticeRepository practices;
    private final ProgressRepository progresses;
    private final CurrentUserService current;
    private final GamificationService gamification = new GamificationService();

    public PracticeUseCase(PracticeRepository practices, ProgressRepository progresses, CurrentUserService current) {
        this.practices = practices;
        this.progresses = progresses;
        this.current = current;
    }

    @Transactional
    public Progress register(int durationMin, LocalDate date, String notes) {
        Student student = current.currentStudent();
        int xp = gamification.xpFromPractice(durationMin);

        Practice practice = new Practice();
        practice.setStudent(student);
        practice.setDate(date);
        practice.setDurationMin(durationMin);
        practice.setNotes(notes);
        practice.setXpEarned(xp);
        practices.save(practice);

        Progress prog = progresses.findByStudentId(student.getId()).orElseGet(() -> {
            Progress np = new Progress();
            np.setStudent(student);
            return np;
        });
        prog.setStreakDays(gamification.newStreak(prog.getStreakDays(), prog.getLastPractice(), date));
        prog.setXpTotal(prog.getXpTotal() + xp);
        prog.setLevel(gamification.level(prog.getXpTotal()));
        prog.setTotalPracticeMin(prog.getTotalPracticeMin() + durationMin);
        prog.setLastPractice(date);
        prog.setUpdatedAt(LocalDateTime.now());
        return progresses.save(prog);
    }

    public int weeklyPracticeMin(UUID studentId) {
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        return practices.findByStudentIdAndDateBetween(studentId, weekStart, today)
            .stream().mapToInt(Practice::getDurationMin).sum();
    }
}
