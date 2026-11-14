package br.com.harmonia.application.lesson;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.lesson.port.AttendanceRepository;
import br.com.harmonia.application.lesson.port.LessonAttachmentRepository;
import br.com.harmonia.application.lesson.port.LessonRepository;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.application.profile.port.StudentRepository;
import br.com.harmonia.application.profile.port.TeacherRepository;
import br.com.harmonia.application.security.port.UserRepository;
import br.com.harmonia.domain.common.OwnershipException;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.infrastructure.persistence.lesson.Attendance;
import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import br.com.harmonia.infrastructure.persistence.lesson.LessonAttachment;
import br.com.harmonia.infrastructure.persistence.lesson.LessonStatus;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.infrastructure.persistence.profile.EnrollmentStatus;
import br.com.harmonia.lessoncore.DomainValidationException;
import br.com.harmonia.lessoncore.LessonRecurrence;
import br.com.harmonia.lessoncore.ScheduleConflictException;
import br.com.harmonia.lessoncore.SessionStatus;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TeacherLessonUseCaseTest {
    @Mock LessonRepository lessons;
    @Mock AttendanceRepository attendances;
    @Mock EnrollmentRepository enrollments;
    @Mock LessonAttachmentRepository attachments;
    @Mock CurrentUserService current;
    @Mock LessonSchedulingGuard schedulingGuard;
    @Mock UserRepository users;
    @Mock StudentRepository students;
    @Mock TeacherRepository teachers;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private TeacherLessonUseCase useCase() {
        return new TeacherLessonUseCase(lessons, attendances, enrollments, current, schedulingGuard, attachments);
    }

    private Enrollment activeEnrollment() {
        Enrollment enrollment = new Enrollment();
        enrollment.setId(UUID.randomUUID());
        enrollment.setStatus(EnrollmentStatus.ACTIVE);
        when(enrollments.findById(enrollment.getId())).thenReturn(Optional.of(enrollment));
        when(current.assertOwnedByCurrentTeacher(enrollment)).thenReturn(enrollment);
        return enrollment;
    }

    @Test
    void register_calculatesEachInitialStatusAndCopiesContentOnlyToFirstOccurrence() {
        Enrollment enrollment = activeEnrollment();
        LocalDate first = LocalDate.now().minusDays(1);
        LocalTime start = LocalTime.of(9, 0);
        LocalTime end = LocalTime.of(10, 0);
        when(lessons.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var result = useCase().register(enrollment.getId(), first, start, end, "Scales", "Practice",
            LessonRecurrence.WEEKLY, first.plusWeeks(2));

        var saved = ArgumentCaptor.forClass(Lesson.class);
        verify(lessons, times(3)).save(saved.capture());
        List<Lesson> occurrences = saved.getAllValues();
        assertThat(result.lesson()).isSameAs(occurrences.getFirst());
        assertThat(result.occurrences()).isEqualTo(3);
        assertThat(occurrences).extracting(Lesson::getStatus)
            .containsExactly(LessonStatus.DONE, LessonStatus.SCHEDULED, LessonStatus.SCHEDULED);
        assertThat(occurrences).extracting(Lesson::getContent).containsExactly("Scales", null, null);
        assertThat(occurrences).extracting(Lesson::getHomework).containsExactly("Practice", null, null);
        assertThat(result.lesson().getSeriesId()).isNotNull();
        assertThat(occurrences).extracting(Lesson::getSeriesId).containsOnly(result.lesson().getSeriesId());
        verify(schedulingGuard).assertSlotIsFree(enrollment, first, start, end, SessionStatus.DONE);
        verify(schedulingGuard).assertSlotIsFree(enrollment, first.plusWeeks(1), start, end, SessionStatus.SCHEDULED);
        verify(schedulingGuard).assertSlotIsFree(enrollment, first.plusWeeks(2), start, end, SessionStatus.SCHEDULED);
        var order = inOrder(schedulingGuard, lessons);
        order.verify(schedulingGuard, times(3)).assertSlotIsFree(eq(enrollment), any(), eq(start), eq(end), any());
        order.verify(lessons, times(3)).save(any());
        verifyNoInteractions(attendances);
    }

    @Test
    void register_collectsAllConflictingDatesBeforeAnySave() {
        Enrollment enrollment = activeEnrollment();
        LocalDate first = LocalDate.now().plusYears(2);
        LocalTime start = LocalTime.of(9, 0);
        LocalTime end = LocalTime.of(10, 0);
        List<LocalDate> conflictDates = List.of(first.plusWeeks(1), first.plusWeeks(3));
        doAnswer(invocation -> {
            if (conflictDates.contains(invocation.<LocalDate>getArgument(1))) {
                throw new ScheduleConflictException("Conflict");
            }
            return null;
        }).when(schedulingGuard).assertSlotIsFree(eq(enrollment), any(LocalDate.class), eq(start), eq(end),
            eq(SessionStatus.SCHEDULED));

        assertThatThrownBy(() -> useCase().register(enrollment.getId(), first, start, end, null, null,
                LessonRecurrence.WEEKLY, first.plusWeeks(4)))
            .isInstanceOfSatisfying(LessonSeriesConflictException.class, conflict ->
                assertThat(conflict.dates()).containsExactly(first.plusWeeks(1), first.plusWeeks(3)));

        verify(schedulingGuard).assertSlotIsFree(enrollment, first.plusWeeks(4), start, end, SessionStatus.SCHEDULED);
        verify(lessons, never()).save(any());
        verify(lessons, never()).saveAll(any());
    }

    @Test
    void register_sixArgumentSignatureCreatesOneIndependentLesson() {
        Enrollment enrollment = activeEnrollment();
        when(lessons.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Lesson saved = useCase().register(enrollment.getId(), LocalDate.now().plusDays(7),
            LocalTime.of(9, 0), LocalTime.of(10, 0), null, null);

        assertThat(saved.getSeriesId()).isNull();
        assertThat(saved.getContent()).isNull();
        assertThat(saved.getHomework()).isNull();
        verify(lessons).save(saved);
        verifyNoInteractions(attendances);
    }

    @Test
    void register_preservesSingleLessonConflictException() {
        Enrollment enrollment = activeEnrollment();
        LocalDate date = LocalDate.now().plusDays(7);
        LocalTime start = LocalTime.of(9, 0);
        LocalTime end = LocalTime.of(10, 0);
        var conflict = new ScheduleConflictException("Original policy message");
        doThrow(conflict).when(schedulingGuard)
            .assertSlotIsFree(enrollment, date, start, end, SessionStatus.SCHEDULED);

        assertThatThrownBy(() -> useCase().register(enrollment.getId(), date, start, end, null, null))
            .isSameAs(conflict);
        verify(lessons, never()).save(any());
    }

    private Lesson lesson(LessonStatus status) {
        Lesson lesson = new Lesson();
        lesson.setId(UUID.randomUUID());
        lesson.setEnrollment(new Enrollment());
        lesson.setDate(LocalDate.now().minusDays(1));
        lesson.setStartTime(LocalTime.of(9, 0));
        lesson.setEndTime(LocalTime.of(10, 0));
        lesson.setStatus(status);
        lesson.setContent("Original content");
        lesson.setHomework("Original homework");
        when(lessons.findById(lesson.getId())).thenReturn(Optional.of(lesson));
        return lesson;
    }

    @Test
    void update_contentInDoneLessonSavesWithoutSchedulingOrAttendanceChecks() {
        Lesson lesson = lesson(LessonStatus.DONE);
        lesson.getEnrollment().setStatus(EnrollmentStatus.SUSPENDED);
        when(lessons.save(lesson)).thenReturn(lesson);

        Lesson saved = useCase().update(lesson.getId(), lesson.getDate(), lesson.getStartTime(), lesson.getEndTime(),
            "Changed content", "Changed homework");

        assertThat(saved.getContent()).isEqualTo("Changed content");
        assertThat(saved.getHomework()).isEqualTo("Changed homework");
        assertThat(saved.getStatus()).isEqualTo(LessonStatus.DONE);
        verify(current).assertOwnedByCurrentTeacher(lesson.getEnrollment());
        verify(lessons).save(lesson);
        verifyNoInteractions(schedulingGuard, attendances, enrollments);
    }

    @Test
    void update_recordedAttendanceRejectsRescheduleWithoutGuardOrMutation() {
        Lesson lesson = lesson(LessonStatus.SCHEDULED);
        LocalDate originalDate = lesson.getDate();
        when(attendances.findByLessonId(lesson.getId())).thenReturn(Optional.of(new Attendance()));

        assertThatThrownBy(() -> useCase().update(lesson.getId(), LocalDate.now().plusDays(1),
            lesson.getStartTime(), lesson.getEndTime(), "Changed", null))
            .isInstanceOf(DomainValidationException.class)
            .hasMessage("Lesson with recorded attendance cannot be rescheduled");

        assertThat(lesson.getDate()).isEqualTo(originalDate);
        assertThat(lesson.getContent()).isEqualTo("Original content");
        verifyNoInteractions(schedulingGuard);
        verify(lessons, never()).save(any());
    }

    @Test
    void update_anotherTeacherIsDeniedBeforeValidationOrMutation() {
        Lesson lesson = lesson(LessonStatus.SCHEDULED);
        doThrow(new OwnershipException("Enrollment belongs to another teacher"))
            .when(current).assertOwnedByCurrentTeacher(lesson.getEnrollment());

        assertThatThrownBy(() -> useCase().update(lesson.getId(), LocalDate.now().plusDays(1),
            lesson.getStartTime(), lesson.getEndTime(), "Changed", null))
            .isInstanceOf(OwnershipException.class);

        assertThat(lesson.getContent()).isEqualTo("Original content");
        verifyNoInteractions(schedulingGuard, attendances);
        verify(lessons, never()).save(any());
    }

    @Test
    void update_adminWithoutTeacherProfileCanEdit() {
        Lesson lesson = lesson(LessonStatus.DONE);
        when(lessons.save(lesson)).thenReturn(lesson);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
            "admin", "", List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        CurrentUserService admin = new CurrentUserService(users, students, teachers);
        var useCase = new TeacherLessonUseCase(lessons, attendances, enrollments, admin, schedulingGuard, attachments);

        assertThat(useCase.update(lesson.getId(), lesson.getDate(), lesson.getStartTime(), lesson.getEndTime(),
            "Changed by admin", null).getContent()).isEqualTo("Changed by admin");

        verifyNoInteractions(users, students, teachers, schedulingGuard, attendances);
    }

    @Test
    void update_overdueScheduledLessonUsesRealIdAndStaysScheduledWhenMovedToToday() {
        Lesson lesson = lesson(LessonStatus.SCHEDULED);
        LocalDate today = LocalDate.now();
        when(lessons.save(lesson)).thenReturn(lesson);

        Lesson saved = useCase().update(lesson.getId(), today, lesson.getStartTime(), lesson.getEndTime(), null, null);

        verify(schedulingGuard).assertSlotIsFree(lesson.getEnrollment(), lesson.getId(), today,
            lesson.getStartTime(), lesson.getEndTime(), SessionStatus.SCHEDULED);
        assertThat(saved.getStatus()).isEqualTo(LessonStatus.SCHEDULED);
        assertThat(saved.getDate()).isEqualTo(today);
        assertThat(saved.getContent()).isNull();
        assertThat(saved.getHomework()).isNull();
    }

    @Test
    void update_inactiveEnrollmentCannotBeRescheduled() {
        Lesson lesson = lesson(LessonStatus.SCHEDULED);
        lesson.getEnrollment().setStatus(EnrollmentStatus.SUSPENDED);

        assertThatThrownBy(() -> useCase().update(lesson.getId(), LocalDate.now().plusDays(1),
            lesson.getStartTime(), lesson.getEndTime(), "Changed", null))
            .isInstanceOf(DomainValidationException.class).hasMessage("Enrollment is not active");

        verifyNoInteractions(schedulingGuard, attendances);
        verify(lessons, never()).save(any());
    }

    @Test
    void update_canceledLessonCannotBeEdited() {
        Lesson lesson = lesson(LessonStatus.CANCELED);

        assertThatThrownBy(() -> useCase().update(lesson.getId(), lesson.getDate(), lesson.getStartTime(),
            lesson.getEndTime(), "Changed", null))
            .isInstanceOf(DomainValidationException.class).hasMessage("Canceled lessons cannot be edited");

        verifyNoInteractions(schedulingGuard, attendances);
        verify(lessons, never()).save(any());
    }

    @Test
    void detail_returnsLessonAndAttachmentsAfterOwnershipCheck() {
        Lesson lesson = lesson(LessonStatus.DONE);
        LessonAttachment attachment = new LessonAttachment();
        when(attachments.findByLessonId(lesson.getId())).thenReturn(List.of(attachment));

        var detail = useCase().detail(lesson.getId());

        assertThat(detail.lesson()).isSameAs(lesson);
        assertThat(detail.attachments()).containsExactly(attachment);
        var order = inOrder(current, attachments);
        order.verify(current).assertOwnedByCurrentTeacher(lesson.getEnrollment());
        order.verify(attachments).findByLessonId(lesson.getId());
    }

    @Test
    void detail_anotherTeacherCannotReadAttachments() {
        Lesson lesson = lesson(LessonStatus.DONE);
        doThrow(new OwnershipException("Enrollment belongs to another teacher"))
            .when(current).assertOwnedByCurrentTeacher(lesson.getEnrollment());

        assertThatThrownBy(() -> useCase().detail(lesson.getId())).isInstanceOf(OwnershipException.class);
        verifyNoInteractions(attachments);
    }

    @Test
    void detailAndUpdate_missingLessonThrowNotFound() {
        UUID id = UUID.randomUUID();

        assertThatThrownBy(() -> useCase().detail(id)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> useCase().update(id, LocalDate.now(), LocalTime.of(9, 0), LocalTime.of(10, 0), null, null))
            .isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(current, attachments, attendances, schedulingGuard);
    }
}
