package br.com.harmonia.application.gamification;

import br.com.harmonia.application.gamification.port.GoalRepository;
import br.com.harmonia.application.gamification.port.PracticeRepository;
import br.com.harmonia.application.lesson.port.AttendanceRepository;
import br.com.harmonia.domain.gamification.GoalCompletedEvent;
import br.com.harmonia.domain.gamification.GoalPeriod;
import br.com.harmonia.infrastructure.persistence.gamification.Goal;
import br.com.harmonia.infrastructure.persistence.gamification.GoalStatus;
import br.com.harmonia.infrastructure.persistence.gamification.GoalType;
import br.com.harmonia.infrastructure.persistence.gamification.Practice;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GoalProgressServiceTest {
    @Mock GoalRepository goals;
    @Mock PracticeRepository practices;
    @Mock AttendanceRepository attendances;
    @Mock ApplicationEventPublisher events;
    @InjectMocks GoalProgressService service;

    private final UUID studentId = UUID.randomUUID();
    private final LocalDate today = LocalDate.now();

    private Goal dailyGoal(int target) {
        Goal goal = new Goal();
        goal.setId(UUID.randomUUID());
        goal.setTitle("Praticar");
        goal.setType(GoalType.PRACTICE_TIME);
        goal.setPeriod(GoalPeriod.DAILY);
        goal.setTarget(target);
        return goal;
    }

    private void practiced(int... minutes) {
        List<Practice> list = Arrays.stream(minutes).mapToObj(m -> {
            Practice p = new Practice();
            p.setDate(today);
            p.setDurationMin(m);
            return p;
        }).toList();
        when(practices.findByStudentIdAndDateBetween(eq(studentId), any(), eq(today))).thenReturn(list);
    }

    @Test
    void publishesWhenThePracticeCrossesTheTarget() {
        Goal goal = dailyGoal(30);
        when(goals.findByStudentIdAndStatusAndPeriodIsNotNull(studentId, GoalStatus.ACTIVE)).thenReturn(List.of(goal));
        practiced(20, 15);

        service.notifyReached(studentId, facts -> facts.withoutPractice(today, 15));

        verify(events).publishEvent(new GoalCompletedEvent(studentId, goal.getId(), "Praticar"));
    }

    @Test
    void staysSilentWhenTheTargetWasAlreadyMet() {
        Goal goal = dailyGoal(30);
        when(goals.findByStudentIdAndStatusAndPeriodIsNotNull(studentId, GoalStatus.ACTIVE)).thenReturn(List.of(goal));
        practiced(40, 15);

        service.notifyReached(studentId, facts -> facts.withoutPractice(today, 15));

        verifyNoInteractions(events);
    }
}
