package br.com.harmonia.domain.gamification;

import java.util.UUID;

public record GoalCompletedEvent(UUID studentId, UUID goalId, String title) {}
