package br.com.harmonia.application.gamification;

import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.gamification.port.GoalRepository;
import br.com.harmonia.infrastructure.persistence.gamification.Goal;
import br.com.harmonia.infrastructure.persistence.gamification.GoalStatus;
import br.com.harmonia.infrastructure.persistence.gamification.GoalType;
import br.com.harmonia.domain.gamification.GoalCompletedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class GoalUseCase {
    private final GoalRepository goals;
    private final CurrentUserService current;
    private final ApplicationEventPublisher events;

    public GoalUseCase(GoalRepository goals, CurrentUserService current, ApplicationEventPublisher events) {
        this.goals = goals;
        this.current = current;
        this.events = events;
    }

    public List<Goal> list(GoalStatus status) {
        var student = current.currentStudent();
        return status == null ? goals.findByStudentId(student.getId())
                              : goals.findByStudentIdAndStatus(student.getId(), status);
    }

    @Transactional
    public Goal create(String title, String description, GoalType type, int target) {
        Goal g = new Goal();
        g.setStudent(current.currentStudent());
        g.setTitle(title);
        g.setDescription(description);
        g.setType(type);
        g.setTarget(target);
        return goals.save(g);
    }

    @Transactional
    public Goal updateProgress(UUID goalId, int currentProgress) {
        Goal g = goals.findById(goalId).orElseThrow(() -> new ResourceNotFoundException("Goal"));
        current.assertOwnedByCurrentStudent(g.getStudent());
        g.setCurrentProgress(currentProgress);
        if (currentProgress >= g.getTarget() && g.getStatus() == GoalStatus.ACTIVE) {
            g.setStatus(GoalStatus.COMPLETED);
            g.setCompletedAt(LocalDateTime.now());
            events.publishEvent(new GoalCompletedEvent(g.getStudent().getId(), g.getId(), g.getTitle()));
        }
        return goals.save(g);
    }
}
