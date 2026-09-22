package br.com.harmonia.application.lesson;

import br.com.harmonia.application.lesson.port.LessonRepository;
import br.com.harmonia.application.schedule.port.ScheduleRepository;
import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.infrastructure.persistence.schedule.Schedule;
import br.com.harmonia.infrastructure.persistence.schedule.Weekday;
import br.com.harmonia.lessoncore.LessonSlot;
import br.com.harmonia.lessoncore.SchedulingPolicy;
import br.com.harmonia.lessoncore.SessionStatus;
import br.com.harmonia.lessoncore.TimeRange;
import br.com.harmonia.lessoncore.WeeklyScheduleSlot;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

@Component
public class LessonSchedulingGuard {
    private final LessonRepository lessons;
    private final ScheduleRepository schedules;
    private final LessonSlotLock slotLock;
    private final SchedulingPolicy policy = new SchedulingPolicy();

    public LessonSchedulingGuard(LessonRepository lessons, ScheduleRepository schedules, LessonSlotLock slotLock) {
        this.lessons = lessons;
        this.schedules = schedules;
        this.slotLock = slotLock;
    }

    public void assertSlotIsFree(Enrollment enrollment, LocalDate date, LocalTime startTime,
                                 LocalTime endTime, SessionStatus status) {
        UUID teacherId = enrollment.getTeacher().getId();
        UUID studentId = enrollment.getStudent().getId();
        slotLock.acquire(teacherId, studentId);
        LessonSlot candidate = new LessonSlot(UUID.randomUUID(), teacherId, studentId, date,
            new TimeRange(startTime, endTime), status);
        policy.validateLessonSlot(candidate, slotsOn(teacherId, studentId, date));
        policy.validateLessonAgainstWeeklySchedules(candidate, recurringSlotsOn(teacherId, studentId, date));
    }

    public void assertWeeklySlotIsFree(Schedule schedule) {
        UUID teacherId = schedule.getEnrollment().getTeacher().getId();
        UUID studentId = schedule.getEnrollment().getStudent().getId();
        slotLock.acquire(teacherId, studentId);
        WeeklyScheduleSlot candidate = toWeeklySlot(schedule);
        List<WeeklyScheduleSlot> recurring = schedules
            .findByEnrollmentTeacherIdOrEnrollmentStudentId(teacherId, studentId).stream()
            .filter(Schedule::getActive)
            .map(LessonSchedulingGuard::toWeeklySlot)
            .toList();
        policy.validateWeeklySlot(candidate, recurring);
        policy.validateWeeklySlotAgainstLessons(candidate, upcomingSlots(teacherId, studentId, LocalDate.now()));
    }

    private List<LessonSlot> upcomingSlots(UUID teacherId, UUID studentId, LocalDate from) {
        return Stream.concat(
                lessons.findByEnrollmentTeacherIdAndDateGreaterThanEqual(teacherId, from).stream(),
                lessons.findByEnrollmentStudentIdAndDateGreaterThanEqual(studentId, from).stream())
            .distinct()
            .map(LessonSchedulingGuard::toSlot)
            .toList();
    }

    private List<WeeklyScheduleSlot> recurringSlotsOn(UUID teacherId, UUID studentId, LocalDate date) {
        return schedules.findByEnrollmentTeacherIdOrEnrollmentStudentId(teacherId, studentId).stream()
            .filter(Schedule::getActive)
            .filter(schedule -> schedule.getWeekday() == Weekday.valueOf(date.getDayOfWeek().name()))
            .map(LessonSchedulingGuard::toWeeklySlot)
            .toList();
    }

    private List<LessonSlot> slotsOn(UUID teacherId, UUID studentId, LocalDate date) {
        return Stream.concat(
                lessons.findByEnrollmentTeacherIdAndDate(teacherId, date).stream(),
                lessons.findByEnrollmentStudentIdAndDate(studentId, date).stream())
            .distinct()
            .map(LessonSchedulingGuard::toSlot)
            .toList();
    }

    private static LessonSlot toSlot(Lesson lesson) {
        return new LessonSlot(lesson.getId(), lesson.getEnrollment().getTeacher().getId(),
            lesson.getEnrollment().getStudent().getId(), lesson.getDate(),
            new TimeRange(lesson.getStartTime(), lesson.getEndTime()),
            LessonStatuses.toSessionStatus(lesson.getStatus()));
    }

    private static WeeklyScheduleSlot toWeeklySlot(Schedule schedule) {
        UUID scheduleId = schedule.getId() != null ? schedule.getId() : UUID.randomUUID();
        return new WeeklyScheduleSlot(scheduleId, schedule.getEnrollment().getTeacher().getId(),
            schedule.getEnrollment().getStudent().getId(),
            java.time.DayOfWeek.valueOf(schedule.getWeekday().name()),
            new TimeRange(schedule.getStartTime(), schedule.getEndTime()));
    }
}
