package br.com.harmonia.application.gamification;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.gamification.GoalUseCase.NewGoal;
import br.com.harmonia.application.gamification.port.GoalRepository;
import br.com.harmonia.application.profile.port.StudentRepository;
import br.com.harmonia.application.teacher.StudentLinkGuard;
import br.com.harmonia.domain.common.OwnershipException;
import br.com.harmonia.domain.gamification.GoalPeriod;
import br.com.harmonia.infrastructure.persistence.gamification.Goal;
import br.com.harmonia.infrastructure.persistence.gamification.GoalStatus;
import br.com.harmonia.infrastructure.persistence.gamification.GoalType;
import br.com.harmonia.infrastructure.persistence.profile.Student;
import br.com.harmonia.infrastructure.persistence.profile.Teacher;
import br.com.harmonia.lessoncore.DomainValidationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GoalUseCaseTest {
    @Mock GoalRepository goals;
    @Mock StudentRepository students;
    @Mock GoalProgressService progress;
    @Mock CurrentUserService current;
    @Mock StudentLinkGuard links;
    @InjectMocks GoalUseCase useCase;

    private final Student student = student();

    private static Student student() {
        Student s = new Student();
        s.setId(UUID.randomUUID());
        return s;
    }

    private static Teacher teacher() {
        Teacher t = new Teacher();
        t.setId(UUID.randomUUID());
        return t;
    }

    private Goal goal(Teacher author) {
        Goal g = new Goal();
        g.setId(UUID.randomUUID());
        g.setStudent(student);
        g.setCreatedByTeacher(author);
        g.setType(GoalType.PRACTICE_TIME);
        g.setPeriod(GoalPeriod.WEEKLY);
        g.setTarget(180);
        return g;
    }

    @Test
    void createForMe_rejectsLegacyTypesAndImpossibleDayTargets() {
        when(current.currentStudent()).thenReturn(student);

        assertThatThrownBy(() -> useCase.createForMe(new NewGoal("x", null, GoalType.OTHER, GoalPeriod.WEEKLY, 1)))
            .isInstanceOf(DomainValidationException.class);
        assertThatThrownBy(() -> useCase.createForMe(new NewGoal("x", null, GoalType.PRACTICE_DAYS, GoalPeriod.WEEKLY, 8)))
            .isInstanceOf(DomainValidationException.class);
        verify(goals, never()).save(any());
    }

    @Test
    void createForMe_storesThePeriodWithoutAuthor() {
        when(current.currentStudent()).thenReturn(student);
        when(goals.save(any())).thenAnswer(call -> {
            Goal saved = call.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });
        when(progress.progressOf(any(), any())).thenReturn(Map.of());

        var view = useCase.createForMe(new NewGoal("Dias", null, GoalType.PRACTICE_DAYS, GoalPeriod.WEEKLY, 7));

        assertThat(view.goal().getPeriod()).isEqualTo(GoalPeriod.WEEKLY);
        assertThat(view.goal().getCreatedByTeacher()).isNull();
        assertThat(view.canEnd()).isTrue();
    }

    @Test
    void endMine_refusesGoalsSetByTheTeacher() {
        Goal goal = goal(teacher());
        when(goals.findById(goal.getId())).thenReturn(Optional.of(goal));

        assertThatThrownBy(() -> useCase.endMine(goal.getId())).isInstanceOf(OwnershipException.class);
        assertThat(goal.getStatus()).isEqualTo(GoalStatus.ACTIVE);
    }

    @Test
    void endMine_endsOwnGoalOnce() {
        Goal goal = goal(null);
        when(goals.findById(goal.getId())).thenReturn(Optional.of(goal));
        when(goals.save(goal)).thenReturn(goal);
        when(progress.progressOf(any(), any())).thenReturn(Map.of());

        var view = useCase.endMine(goal.getId());
        useCase.endMine(goal.getId());

        assertThat(goal.getStatus()).isEqualTo(GoalStatus.ENDED);
        assertThat(goal.getEndedAt()).isNotNull();
        assertThat(view.canEnd()).isFalse();
        verify(goals, times(1)).save(goal);
    }

    @Test
    void endForStudent_onlyTheAuthorTeacherCanEnd() {
        Goal goal = goal(teacher());
        when(goals.findById(goal.getId())).thenReturn(Optional.of(goal));
        when(current.currentTeacher()).thenReturn(teacher());

        assertThatThrownBy(() -> useCase.endForStudent(student.getId(), goal.getId()))
            .isInstanceOf(OwnershipException.class);
        verify(links).assertLinked(student.getId());
    }
}
