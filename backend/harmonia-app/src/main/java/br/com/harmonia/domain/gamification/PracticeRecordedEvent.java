package br.com.harmonia.domain.gamification;

import java.time.LocalDate;
import java.util.UUID;

public record PracticeRecordedEvent(UUID studentId, UUID practiceId, int durationMin, LocalDate date) {}
