package br.com.harmonia.presentation.response;

import br.com.harmonia.application.gamification.GoalUseCase.GoalView;
import br.com.harmonia.domain.gamification.GoalPeriod;
import br.com.harmonia.infrastructure.persistence.gamification.Goal;
import br.com.harmonia.infrastructure.persistence.gamification.GoalStatus;
import br.com.harmonia.infrastructure.persistence.gamification.GoalType;

import java.time.LocalDate;
import java.util.UUID;

public record GoalResponse(UUID id, String title, String description, GoalType type, GoalPeriod period,
                           Integer target, Integer currentProgress, GoalStatus status, boolean legacy,
                           String createdByTeacher, boolean canEnd, LocalDate periodStart, LocalDate periodEnd,
                           boolean achieved, int streak, boolean completed) {
    public static GoalResponse of(GoalView view) {
        Goal goal = view.goal();
        var progress = view.progress();
        String teacher = goal.getCreatedByTeacher() == null ? null
            : goal.getCreatedByTeacher().getUser().nameForDisplay();
        return new GoalResponse(goal.getId(), goal.getTitle(), goal.getDescription(), goal.getType(), goal.getPeriod(),
            goal.getTarget(), progress == null ? goal.getCurrentProgress() : progress.current(), goal.getStatus(),
            goal.isLegacy(), teacher, view.canEnd(),
            progress == null ? null : progress.periodStart(), progress == null ? null : progress.periodEnd(),
            progress == null ? goal.getStatus() == GoalStatus.COMPLETED : progress.achieved(),
            progress == null ? 0 : progress.streak(), goal.isCompleted() || goal.getStatus() == GoalStatus.COMPLETED);
    }
}
