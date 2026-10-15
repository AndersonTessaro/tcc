package br.com.harmonia.lessoncore;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LessonLifecyclePolicyTest {
    private final LessonLifecyclePolicy policy = new LessonLifecyclePolicy();

    @Test
    void scheduledAndDoneLessonsAllowContentEdits() {
        assertThatCode(() -> policy.validateContentEdit(SessionStatus.SCHEDULED)).doesNotThrowAnyException();
        assertThatCode(() -> policy.validateContentEdit(SessionStatus.DONE)).doesNotThrowAnyException();
    }

    @Test
    void canceledLessonRejectsContentEdits() {
        assertThatThrownBy(() -> policy.validateContentEdit(SessionStatus.CANCELED))
            .isInstanceOf(DomainValidationException.class)
            .hasMessage("Canceled lessons cannot be edited");
    }

    @Test
    void doneAndCanceledLessonsCannotBeRescheduled() {
        LocalDate today = LocalDate.of(2026, 10, 14);
        for (SessionStatus status : new SessionStatus[] {SessionStatus.DONE, SessionStatus.CANCELED}) {
            assertThatThrownBy(() -> policy.validateReschedule(status, today.plusDays(1), today, false))
                .isInstanceOf(DomainValidationException.class)
                .hasMessage("Only scheduled lessons can be rescheduled");
        }
    }

    @Test
    void reschedulingToYesterdayIsRejected() {
        LocalDate today = LocalDate.of(2026, 10, 14);
        assertThatThrownBy(() -> policy.validateReschedule(SessionStatus.SCHEDULED, today.minusDays(1), today, false))
            .isInstanceOf(DomainValidationException.class)
            .hasMessage("Lesson cannot be moved to a past date");
    }

    @Test
    void reschedulingToTodayOrTomorrowIsAllowed() {
        LocalDate today = LocalDate.of(2026, 10, 14);
        assertThatCode(() -> policy.validateReschedule(SessionStatus.SCHEDULED, today, today, false))
            .doesNotThrowAnyException();
        assertThatCode(() -> policy.validateReschedule(SessionStatus.SCHEDULED, today.plusDays(1), today, false))
            .doesNotThrowAnyException();
    }

    @Test
    void recordedAttendancePreventsRescheduling() {
        LocalDate today = LocalDate.of(2026, 10, 14);
        assertThatThrownBy(() -> policy.validateReschedule(SessionStatus.SCHEDULED, today.plusDays(1), today, true))
            .isInstanceOf(DomainValidationException.class)
            .hasMessage("Lesson with recorded attendance cannot be rescheduled");
    }

    @Test
    void overdueScheduledLessonCanBeMovedToTheFuture() {
        LocalDate originalDate = LocalDate.of(2026, 10, 12);
        LocalDate today = originalDate.plusDays(2);
        assertThatCode(() -> policy.validateReschedule(SessionStatus.SCHEDULED, today.plusDays(1), today, false))
            .doesNotThrowAnyException();
    }

    @Test
    void scheduledLessonCanBeCompletedOrCanceled() {
        assertThatCode(() -> policy.validateTransition(SessionStatus.SCHEDULED, SessionStatus.DONE))
            .doesNotThrowAnyException();
        assertThatCode(() -> policy.validateTransition(SessionStatus.SCHEDULED, SessionStatus.CANCELED))
            .doesNotThrowAnyException();
    }

    @Test
    void repeatingTheCurrentStatusIsAllowed() {
        assertThatCode(() -> policy.validateTransition(SessionStatus.DONE, SessionStatus.DONE))
            .doesNotThrowAnyException();
    }

    @Test
    void completedLessonCannotBeReopened() {
        assertThatThrownBy(() -> policy.validateTransition(SessionStatus.DONE, SessionStatus.SCHEDULED))
            .isInstanceOf(DomainValidationException.class)
            .hasMessageContaining("DONE to SCHEDULED");
    }

    @Test
    void canceledLessonCannotBeCompleted() {
        assertThatThrownBy(() -> policy.validateTransition(SessionStatus.CANCELED, SessionStatus.DONE))
            .isInstanceOf(DomainValidationException.class);
    }

    @Test
    void missingStatus_throws() {
        assertThatThrownBy(() -> policy.validateTransition(null, SessionStatus.DONE))
            .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> policy.validateTransition(SessionStatus.SCHEDULED, null))
            .isInstanceOf(NullPointerException.class);
    }

    @Test
    void futureLesson_startsScheduled_otherwiseDone() {
        LocalDate today = LocalDate.of(2026, 9, 22);
        assertThat(new LessonLifecyclePolicy().initialStatus(today.plusDays(1), today)).isEqualTo(SessionStatus.SCHEDULED);
        assertThat(new LessonLifecyclePolicy().initialStatus(today, today)).isEqualTo(SessionStatus.DONE);
        assertThat(new LessonLifecyclePolicy().initialStatus(today.minusDays(7), today)).isEqualTo(SessionStatus.DONE);
    }
}
