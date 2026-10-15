package br.com.harmonia.application.gamification;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.gamification.port.GoalRepository;
import br.com.harmonia.domain.gamification.GoalCompletedEvent;
import br.com.harmonia.infrastructure.persistence.gamification.Goal;
import br.com.harmonia.infrastructure.persistence.gamification.GoalStatus;
import br.com.harmonia.infrastructure.persistence.profile.Student;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GoalUseCaseTest {
    @Mock GoalRepository goals;
    @Mock CurrentUserService current;
    @Mock ApplicationEventPublisher events;
    @InjectMocks GoalUseCase useCase;

    @Test
    void publishesOnlyOnTheActiveToCompletedTransition() {
        Student student = new Student();
        student.setId(UUID.randomUUID());
        Goal goal = new Goal();
        goal.setId(UUID.randomUUID());
        goal.setStudent(student);
        goal.setTitle("Escalas");
        goal.setTarget(10);
        when(goals.findById(goal.getId())).thenReturn(Optional.of(goal));

        useCase.updateProgress(goal.getId(), 9);
        verifyNoInteractions(events);
        useCase.updateProgress(goal.getId(), 10);
        assertThat(goal.getStatus()).isEqualTo(GoalStatus.COMPLETED);
        assertThat(goal.getCompletedAt()).isNotNull();
        useCase.updateProgress(goal.getId(), 11);
        useCase.updateProgress(goal.getId(), 1);
        useCase.updateProgress(goal.getId(), 10);
        verify(events).publishEvent(new GoalCompletedEvent(student.getId(), goal.getId(), "Escalas"));
        verifyNoMoreInteractions(events);
    }
}
