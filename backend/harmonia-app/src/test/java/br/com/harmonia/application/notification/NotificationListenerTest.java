package br.com.harmonia.application.notification;

import br.com.harmonia.application.notification.port.NotificationRepository;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.domain.gamification.GoalCompletedEvent;
import br.com.harmonia.domain.gamification.PracticeRecordedEvent;
import br.com.harmonia.domain.notification.NotificationType;
import br.com.harmonia.infrastructure.persistence.notification.Notification;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.infrastructure.persistence.profile.EnrollmentStatus;
import br.com.harmonia.infrastructure.persistence.profile.Student;
import br.com.harmonia.infrastructure.persistence.profile.Teacher;
import br.com.harmonia.infrastructure.persistence.security.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationListenerTest {
    @Mock EnrollmentRepository enrollments;
    @Mock NotificationRepository notifications;
    @InjectMocks NotificationListener listener;

    @Test
    void practiceNotifiesEachActiveTeacherOnceAndIgnoresClosedEnrollments() {
        UUID studentId = UUID.randomUUID();
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();
        UUID practiceId = UUID.randomUUID();
        when(enrollments.findByStudentId(studentId)).thenReturn(List.of(
            enrollment(studentId, first, EnrollmentStatus.ACTIVE), enrollment(studentId, first, EnrollmentStatus.ACTIVE),
            enrollment(studentId, second, EnrollmentStatus.ACTIVE), enrollment(studentId, UUID.randomUUID(), EnrollmentStatus.CLOSED)));

        listener.onPracticeRecorded(new PracticeRecordedEvent(studentId, practiceId, 30, LocalDate.of(2026, 10, 15)));

        var saved = ArgumentCaptor.forClass(Notification.class);
        verify(notifications, times(2)).save(saved.capture());
        assertThat(saved.getAllValues()).extracting(Notification::getUserId).containsExactly(first, second);
        assertThat(saved.getAllValues()).allSatisfy(n -> {
            assertThat(n.getType()).isEqualTo(NotificationType.PRACTICE_RECORDED);
            assertThat(n.getTitle()).isEqualTo("Nova prática registrada");
            assertThat(n.getBody()).isEqualTo("Ana praticou 30 min (15/10)");
            assertThat(n.getStudentId()).isEqualTo(studentId);
            assertThat(n.getPracticeId()).isEqualTo(practiceId);
            assertThat(n.getLessonId()).isNull();
        });
    }

    @Test
    void goalUsesTheSameActiveRecipientRuleAndLinksTheStudent() {
        UUID studentId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(enrollments.findByStudentId(studentId)).thenReturn(List.of(
            enrollment(studentId, userId, EnrollmentStatus.ACTIVE), enrollment(studentId, userId, EnrollmentStatus.ACTIVE),
            enrollment(studentId, UUID.randomUUID(), EnrollmentStatus.CLOSED)));
        listener.onGoalCompleted(new GoalCompletedEvent(studentId, UUID.randomUUID(), "Escalas"));
        var saved = ArgumentCaptor.forClass(Notification.class);
        verify(notifications).save(saved.capture());
        assertThat(saved.getValue().getType()).isEqualTo(NotificationType.GOAL_COMPLETED);
        assertThat(saved.getValue().getBody()).isEqualTo("Ana concluiu a meta \"Escalas\"");
        assertThat(saved.getValue().getStudentId()).isEqualTo(studentId);
        assertThat(saved.getValue().getPracticeId()).isNull();
    }

    @Test
    void notificationFailurePropagatesToThePublisher() {
        UUID studentId = UUID.randomUUID();
        when(enrollments.findByStudentId(studentId)).thenReturn(List.of(
            enrollment(studentId, UUID.randomUUID(), EnrollmentStatus.ACTIVE)));
        when(notifications.save(any())).thenThrow(new IllegalStateException("Database unavailable"));
        assertThatThrownBy(() -> listener.onPracticeRecorded(
            new PracticeRecordedEvent(studentId, UUID.randomUUID(), 30, LocalDate.now())))
            .isInstanceOf(IllegalStateException.class);
    }

    private Enrollment enrollment(UUID studentId, UUID userId, EnrollmentStatus status) {
        User studentUser = new User();
        studentUser.setDisplayName("Ana");
        Student student = new Student();
        student.setId(studentId);
        student.setUser(studentUser);
        User teacherUser = new User();
        teacherUser.setId(userId);
        Teacher teacher = new Teacher();
        teacher.setUser(teacherUser);
        Enrollment enrollment = new Enrollment();
        enrollment.setStudent(student);
        enrollment.setTeacher(teacher);
        enrollment.setStatus(status);
        return enrollment;
    }
}
