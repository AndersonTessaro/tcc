package br.com.harmonia.application.lesson;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.lesson.port.AttendanceRepository;
import br.com.harmonia.application.lesson.port.LessonAttachmentRepository;
import br.com.harmonia.application.lesson.port.LessonAttendanceStatus;
import br.com.harmonia.application.lesson.port.LessonRepository;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.infrastructure.persistence.lesson.AttendanceStatus;
import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TeacherDashboardAttendanceTest {
    @Mock LessonRepository lessons;
    @Mock AttendanceRepository attendances;
    @Mock EnrollmentRepository enrollments;
    @Mock CurrentUserService current;
    @Mock LessonSchedulingGuard guard;
    @Mock LessonAttachmentRepository attachments;
    @InjectMocks TeacherLessonUseCase useCase;

    @Test
    void loadsAllAttendanceStatusesWithOneBatchAndLeavesUnrecordedLessonAbsent() {
        Lesson first = new Lesson();
        first.setId(UUID.randomUUID());
        Lesson second = new Lesson();
        second.setId(UUID.randomUUID());
        Lesson unrecorded = new Lesson();
        unrecorded.setId(UUID.randomUUID());
        List<UUID> ids = List.of(first.getId(), second.getId(), unrecorded.getId());
        when(attendances.findStatusesByLessonIds(ids)).thenReturn(List.of(
            new LessonAttendanceStatus(first.getId(), AttendanceStatus.PRESENT),
            new LessonAttendanceStatus(second.getId(), AttendanceStatus.ABSENT)));

        var statuses = useCase.attendanceByLesson(List.of(first, second, unrecorded));

        assertThat(statuses).containsEntry(first.getId(), AttendanceStatus.PRESENT)
            .containsEntry(second.getId(), AttendanceStatus.ABSENT).doesNotContainKey(unrecorded.getId());
        verify(attendances).findStatusesByLessonIds(ids);
        verifyNoMoreInteractions(attendances);
    }

    @Test
    void emptyDashboardNeedsNoAttendanceQuery() {
        assertThat(useCase.attendanceByLesson(List.of())).isEmpty();
        verifyNoInteractions(attendances);
    }
}
