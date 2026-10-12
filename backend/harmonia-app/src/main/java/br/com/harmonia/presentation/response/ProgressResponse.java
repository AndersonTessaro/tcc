package br.com.harmonia.presentation.response;

import br.com.harmonia.application.gamification.PracticeUseCase.PracticeRegistration;

import java.util.UUID;

public record ProgressResponse(UUID practiceId, Integer xpTotal, Integer level, Integer streakDays,
                               Integer totalPracticeMin) {
    public static ProgressResponse of(PracticeRegistration registration) {
        var progress = registration.progress();
        return new ProgressResponse(registration.practice().getId(), progress.getXpTotal(), progress.getLevel(),
            progress.getStreakDays(), progress.getTotalPracticeMin());
    }
}
