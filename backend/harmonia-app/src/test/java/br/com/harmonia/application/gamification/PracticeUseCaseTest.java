package br.com.harmonia.application.gamification;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.gamification.port.PracticeRepository;
import br.com.harmonia.application.gamification.port.ProgressRepository;
import br.com.harmonia.infrastructure.persistence.gamification.Practice;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PracticeUseCaseTest {
    @Mock PracticeRepository practices;
    @Mock ProgressRepository progresses;
    @Mock CurrentUserService current;
    @Mock ApplicationEventPublisher events;
    @Mock GoalProgressService goalProgress;

    private PracticeUseCase useCase(String instant) {
        Clock clock = Clock.fixed(Instant.parse(instant), ZoneId.of("America/Sao_Paulo"));
        return new PracticeUseCase(practices, progresses, current, events, goalProgress, clock);
    }

    @Test
    void weeklyMinutesUseTheApplicationDateEvenWhenUtcIsAlreadyMonday() {
        UUID studentId = UUID.randomUUID();
        Practice first = new Practice();
        first.setDurationMin(20);
        Practice second = new Practice();
        second.setDurationMin(35);
        when(practices.findByStudentIdAndDateBetween(studentId, LocalDate.of(2026, 10, 19), LocalDate.of(2026, 10, 25)))
            .thenReturn(List.of(first, second));

        assertThat(useCase("2026-10-26T02:30:00Z").weeklyPracticeMin(studentId)).isEqualTo(55);
    }

    @Test
    void newWeekStartsAtMidnightInTheApplicationZone() {
        UUID studentId = UUID.randomUUID();
        LocalDate monday = LocalDate.of(2026, 10, 26);

        assertThat(useCase("2026-10-26T03:00:00Z").weeklyPracticeMin(studentId)).isZero();
        verify(practices).findByStudentIdAndDateBetween(studentId, monday, monday);
    }
}
