package br.com.harmonia.application.gamification;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.gamification.port.PracticeRepository;
import br.com.harmonia.application.gamification.port.ProgressRepository;
import br.com.harmonia.domain.gamification.GamificationService;
import br.com.harmonia.infrastructure.persistence.gamification.Practice;
import br.com.harmonia.infrastructure.persistence.gamification.Progress;
import br.com.harmonia.infrastructure.persistence.profile.Student;
import br.com.harmonia.domain.gamification.PracticeRecordedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class PracticeUseCase {
    private final PracticeRepository practices;
    private final ProgressRepository progresses;
    private final CurrentUserService current;
    private final ApplicationEventPublisher events;
    private final GamificationService gamification = new GamificationService();

    public PracticeUseCase(PracticeRepository practices, ProgressRepository progresses, CurrentUserService current,
                           ApplicationEventPublisher events) {
        this.practices = practices;
        this.progresses = progresses;
        this.current = current;
        this.events = events;
    }

    public record PracticeRegistration(Practice practice, Progress progress) {}

    @Transactional
    public PracticeRegistration register(int durationMin, LocalDate date, String notes, String difficulty, Integer rating) {
        Student student = current.currentStudent();
        int xp = gamification.xpFromPractice(durationMin);

        Practice practice = new Practice();
        practice.setStudent(student);
        practice.setDate(date);
        practice.setDurationMin(durationMin);
        practice.setNotes(notes);
        practice.setDifficulty(difficulty);
        practice.setRating(rating);
        practice.setXpEarned(xp);
        Practice savedPractice = practices.save(practice);

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
        Progress savedProgress = progresses.save(prog);
        events.publishEvent(new PracticeRecordedEvent(student.getId(), savedPractice.getId(), durationMin, date));
        return new PracticeRegistration(savedPractice, savedProgress);
    }

    public int weeklyPracticeMin(UUID studentId) {
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        return practices.findByStudentIdAndDateBetween(studentId, weekStart, today)
            .stream().mapToInt(Practice::getDurationMin).sum();
    }

    @Transactional(readOnly = true)
    public List<Practice> myPractices() {
        // ponytail: capped at the 1000 most recent (years of history); add Pageable if the screen needs more.
        return practices.findTop1000ByStudentIdOrderByDateDescCreatedAtDesc(current.currentStudent().getId());
    }
}
