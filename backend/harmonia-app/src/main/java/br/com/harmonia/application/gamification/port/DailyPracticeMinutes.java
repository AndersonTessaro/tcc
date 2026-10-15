package br.com.harmonia.application.gamification.port;

import java.time.LocalDate;

public record DailyPracticeMinutes(LocalDate date, long minutes) {}
