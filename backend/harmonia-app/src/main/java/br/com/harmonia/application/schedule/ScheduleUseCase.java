package br.com.harmonia.application.schedule;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.lesson.LessonSlotLock;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.application.schedule.port.ScheduleRepository;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.infrastructure.persistence.schedule.Schedule;
import br.com.harmonia.infrastructure.persistence.schedule.Weekday;
import br.com.harmonia.lessoncore.SchedulingPolicy;
import br.com.harmonia.lessoncore.TimeRange;
import br.com.harmonia.lessoncore.WeeklyScheduleSlot;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Service
public class ScheduleUseCase {
    private final ScheduleRepository schedules;
    private final EnrollmentRepository enrollments;
    private final CurrentUserService current;
    private final LessonSlotLock slotLock;
    private final SchedulingPolicy schedulingPolicy = new SchedulingPolicy();

    public ScheduleUseCase(ScheduleRepository schedules, EnrollmentRepository enrollments,
                           CurrentUserService current, LessonSlotLock slotLock) {
        this.schedules = schedules;
        this.enrollments = enrollments;
        this.current = current;
        this.slotLock = slotLock;
    }

    public List<Schedule> mySchedules() {
        return schedules.findByEnrollmentTeacherId(current.currentTeacher().getId());
    }

    @Transactional
    public Schedule create(UUID enrollmentId, Weekday weekday, LocalTime startTime, LocalTime endTime) {
        Enrollment e = current.assertOwnedByCurrentTeacher(enrollments.findById(enrollmentId).orElseThrow());
        slotLock.acquire(e.getTeacher().getId(), e.getStudent().getId());
        WeeklyScheduleSlot candidate = toSlot(UUID.randomUUID(), e, weekday, startTime, endTime);
        List<WeeklyScheduleSlot> existing = schedules
            .findByEnrollmentTeacherIdOrEnrollmentStudentId(e.getTeacher().getId(), e.getStudent().getId())
            .stream().filter(Schedule::getActive).map(this::toSlot).toList();
        schedulingPolicy.validateWeeklySlot(candidate, existing);
        Schedule s = new Schedule();
        s.setEnrollment(e);
        s.setWeekday(weekday);
        s.setStartTime(startTime);
        s.setEndTime(endTime);
        return schedules.save(s);
    }

    @Transactional
    public Schedule setActive(UUID scheduleId, boolean active) {
        Schedule schedule = schedules.findById(scheduleId).orElseThrow();
        current.assertOwnedByCurrentTeacher(schedule.getEnrollment());
        schedule.setActive(active);
        return schedules.save(schedule);
    }

    private WeeklyScheduleSlot toSlot(Schedule schedule) {
        return toSlot(schedule.getId(), schedule.getEnrollment(), schedule.getWeekday(),
            schedule.getStartTime(), schedule.getEndTime());
    }

    private WeeklyScheduleSlot toSlot(UUID id, Enrollment enrollment, Weekday weekday,
                                      LocalTime startTime, LocalTime endTime) {
        return new WeeklyScheduleSlot(id, enrollment.getTeacher().getId(), enrollment.getStudent().getId(),
            java.time.DayOfWeek.valueOf(weekday.name()), new TimeRange(startTime, endTime));
    }
}
