package br.com.harmonia.presentation.response;

import br.com.harmonia.infrastructure.persistence.gamification.Goal;
import br.com.harmonia.infrastructure.persistence.gamification.GoalStatus;
import br.com.harmonia.infrastructure.persistence.gamification.GoalType;

import java.util.UUID;

public record GoalResponse(UUID id, String title, GoalType type, Integer target,
                           Integer currentProgress, String description, GoalStatus status) {
    public static GoalResponse of(Goal goal) {
        return new GoalResponse(goal.getId(), goal.getTitle(), goal.getType(), goal.getTarget(),
            goal.getCurrentProgress(), goal.getDescription(), goal.getStatus());
    }
}
