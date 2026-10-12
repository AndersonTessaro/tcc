package br.com.harmonia.presentation.response;

import br.com.harmonia.infrastructure.persistence.gamification.Progress;

public record ProgressResponse(Integer xpTotal, Integer level, Integer streakDays, Integer totalPracticeMin) {
    public static ProgressResponse of(Progress progress) {
        return new ProgressResponse(progress.getXpTotal(), progress.getLevel(), progress.getStreakDays(),
            progress.getTotalPracticeMin());
    }
}
