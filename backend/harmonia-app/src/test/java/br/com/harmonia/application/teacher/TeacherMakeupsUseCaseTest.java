package br.com.harmonia.application.teacher;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.lesson.port.MakeupLessonRepository;
import br.com.harmonia.infrastructure.persistence.profile.Teacher;
import br.com.harmonia.lessoncore.DomainValidationException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class TeacherMakeupsUseCaseTest {
    @Test
    void defaultsToPast30AndFuture60DaysForCurrentTeacher() {
        var current = mock(CurrentUserService.class);
        var makeups = mock(MakeupLessonRepository.class);
        var teacher = new Teacher();
        teacher.setId(UUID.randomUUID());
        when(current.currentTeacher()).thenReturn(teacher);
        new TeacherMakeupsUseCase(makeups, current).list(null, null);
        verify(makeups).findForTeacher(teacher.getId(), LocalDate.now().minusDays(30), LocalDate.now().plusDays(60));
    }

    @Test
    void rejectsInvalidPeriodsBeforeReadingMakeups() {
        var current = mock(CurrentUserService.class);
        var makeups = mock(MakeupLessonRepository.class);
        when(current.currentTeacher()).thenReturn(new Teacher());
        var useCase = new TeacherMakeupsUseCase(makeups, current);
        var today = LocalDate.now();
        assertThatThrownBy(() -> useCase.list(today, today.minusDays(1)))
            .isInstanceOf(DomainValidationException.class);
        assertThatThrownBy(() -> useCase.list(today.minusDays(366), today))
            .isInstanceOf(DomainValidationException.class);
        verifyNoInteractions(makeups);
    }
}
