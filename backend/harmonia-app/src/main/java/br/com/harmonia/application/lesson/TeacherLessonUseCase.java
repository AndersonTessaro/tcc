package br.com.harmonia.application.lesson;

import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.application.lesson.port.AttendanceRepository;
import br.com.harmonia.application.lesson.port.LessonAttendanceStatus;
import br.com.harmonia.application.lesson.port.LessonRepository;
import br.com.harmonia.application.lesson.port.LessonAttachmentRepository;
import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.profile.EnrollmentRules;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.infrastructure.persistence.lesson.AttendanceStatus;
import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import br.com.harmonia.infrastructure.persistence.lesson.LessonAttachment;
import br.com.harmonia.infrastructure.persistence.lesson.LessonStatus;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.lessoncore.LessonLifecyclePolicy;
import br.com.harmonia.lessoncore.LessonRecurrence;
import br.com.harmonia.lessoncore.ScheduleConflictException;
import br.com.harmonia.lessoncore.SessionStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class TeacherLessonUseCase {
    private final LessonRepository lessons;
    private final LessonAttachmentRepository attachments;
    private final AttendanceRepository attendances;
    private final EnrollmentRepository enrollments;
    private final CurrentUserService current;
    private final LessonSchedulingGuard schedulingGuard;
    private final LessonLifecyclePolicy lifecyclePolicy = new LessonLifecyclePolicy();

    public TeacherLessonUseCase(LessonRepository lessons, AttendanceRepository attendances,
                                EnrollmentRepository enrollments, CurrentUserService current,
                                LessonSchedulingGuard schedulingGuard, LessonAttachmentRepository attachments) {
        this.lessons = lessons;
        this.attachments = attachments;
        this.attendances = attendances;
        this.enrollments = enrollments;
        this.current = current;
        this.schedulingGuard = schedulingGuard;
    }

    private Enrollment teacherEnrollment(UUID enrollmentId) {
        return current.assertOwnedByCurrentTeacher(enrollments.findById(enrollmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Enrollment")));
    }

    public record Detail(Lesson lesson, List<LessonAttachment> attachments) {}

    @Transactional(readOnly = true)
    public Detail detail(UUID lessonId) {
        Lesson lesson = lessons.findById(lessonId).orElseThrow(() -> new ResourceNotFoundException("Lesson"));
        current.assertOwnedByCurrentTeacher(lesson.getEnrollment());
        return new Detail(lesson, attachments.findByLessonId(lessonId));
    }

    @Transactional
    public Lesson update(UUID id, LocalDate date, LocalTime start, LocalTime end, String content, String homework) {
        Lesson lesson = lessons.findById(id).orElseThrow(() -> new ResourceNotFoundException("Lesson"));
        Enrollment enrollment = lesson.getEnrollment();
        current.assertOwnedByCurrentTeacher(enrollment);
        SessionStatus status = LessonStatuses.toSessionStatus(lesson.getStatus());
        lifecyclePolicy.validateContentEdit(status);
        boolean rescheduled = !lesson.getDate().equals(date) || !lesson.getStartTime().equals(start)
            || !lesson.getEndTime().equals(end);
        if (rescheduled) {
            EnrollmentRules.requireActive(enrollment);
            lifecyclePolicy.validateReschedule(status, date, LocalDate.now(), attendances.findByLessonId(id).isPresent());
            schedulingGuard.assertSlotIsFree(enrollment, id, date, start, end, SessionStatus.SCHEDULED);
        }
        lesson.setDate(date);
        lesson.setStartTime(start);
        lesson.setEndTime(end);
        lesson.setContent(content);
        lesson.setHomework(homework);
        return lessons.save(lesson);
    }

    @Transactional
    public Lesson register(UUID enrollmentId, LocalDate date, LocalTime start, LocalTime end,
                           String content, String homework) {
        return register(enrollmentId, date, start, end, content, homework, LessonRecurrence.NONE, null).lesson();
    }

    public record Registration(Lesson lesson, int occurrences) {}

    @Transactional
    public Registration register(UUID enrollmentId, LocalDate date, LocalTime start, LocalTime end,
                                 String content, String homework, LessonRecurrence recurrence, LocalDate repeatUntil) {
        Enrollment enrollment = EnrollmentRules.requireActive(teacherEnrollment(enrollmentId));
        LessonRecurrence effectiveRecurrence = recurrence == null ? LessonRecurrence.NONE : recurrence;
        List<LocalDate> dates = effectiveRecurrence.occurrences(date, repeatUntil);
        UUID seriesId = effectiveRecurrence == LessonRecurrence.NONE ? null : UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        List<Lesson> occurrences = new ArrayList<>();
        List<LocalDate> conflicts = new ArrayList<>();
        for (LocalDate occurrenceDate : dates) {
            SessionStatus initialStatus = lifecyclePolicy.initialStatus(occurrenceDate, start, now);
            try {
                schedulingGuard.assertSlotIsFree(enrollment, occurrenceDate, start, end, initialStatus);
            } catch (ScheduleConflictException conflict) {
                if (effectiveRecurrence == LessonRecurrence.NONE) throw conflict;
                conflicts.add(occurrenceDate);
            }
            Lesson lesson = new Lesson();
            lesson.setEnrollment(enrollment);
            lesson.setDate(occurrenceDate);
            lesson.setStartTime(start);
            lesson.setEndTime(end);
            lesson.setContent(occurrences.isEmpty() ? content : null);
            lesson.setHomework(occurrences.isEmpty() ? homework : null);
            lesson.setStatus(LessonStatuses.toLessonStatus(initialStatus));
            lesson.setSeriesId(seriesId);
            occurrences.add(lesson);
        }
        if (!conflicts.isEmpty()) throw new LessonSeriesConflictException(conflicts);
        List<Lesson> saved = occurrences.stream().map(lessons::save).toList();
        return new Registration(saved.getFirst(), saved.size());
    }

    @Transactional(readOnly = true)
    public SlotAvailability availability(UUID enrollmentId, LocalDate date, LocalTime start, LocalTime end) {
        return availability(enrollmentId, date, start, end, null);
    }

    @Transactional(readOnly = true)
    public SlotAvailability availability(UUID enrollmentId, LocalDate date, LocalTime start, LocalTime end,
                                         UUID excludeLessonId) {
        Enrollment enrollment = teacherEnrollment(enrollmentId);
        SessionStatus initialStatus = lifecyclePolicy.initialStatus(date, start, LocalDateTime.now());
        return schedulingGuard.availability(enrollment, date, start, end, initialStatus, excludeLessonId);
    }

    @Transactional
    public Lesson changeStatus(UUID lessonId, LessonStatus next) {
        Lesson lesson = lessons.findById(lessonId).orElseThrow(() -> new ResourceNotFoundException("Lesson"));
        current.assertOwnedByCurrentTeacher(lesson.getEnrollment());
        lifecyclePolicy.validateTransition(LessonStatuses.toSessionStatus(lesson.getStatus()),
            LessonStatuses.toSessionStatus(next));
        lesson.setStatus(next);
        return lessons.save(lesson);
    }

    public List<Lesson> history(LocalDate start, LocalDate end) {
        return lessons.findByEnrollmentTeacherIdAndDateBetween(current.currentTeacher().getId(), start, end);
    }

    public List<Lesson> scheduleForDay(LocalDate date) {
        return lessons.findByEnrollmentTeacherIdAndDate(current.currentTeacher().getId(), date).stream()
            .sorted(java.util.Comparator.comparing(Lesson::getStartTime))
            .toList();
    }

    public Map<UUID, AttendanceStatus> attendanceByLesson(List<Lesson> dayLessons) {
        List<UUID> ids = dayLessons.stream().map(Lesson::getId).toList();
        if (ids.isEmpty()) return Map.of();
        return attendances.findStatusesByLessonIds(ids).stream()
            .collect(Collectors.toMap(LessonAttendanceStatus::lessonId, LessonAttendanceStatus::status));
    }
}
