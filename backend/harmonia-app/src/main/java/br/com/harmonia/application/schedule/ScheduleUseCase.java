package br.com.harmonia.application.schedule;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.lesson.LessonSchedulingGuard;
import br.com.harmonia.application.profile.EnrollmentRules;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.application.schedule.port.ScheduleRepository;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.infrastructure.persistence.schedule.Schedule;
import br.com.harmonia.infrastructure.persistence.schedule.Weekday;
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
    private final LessonSchedulingGuard schedulingGuard;

    public ScheduleUseCase(ScheduleRepository schedules, EnrollmentRepository enrollments,
                           CurrentUserService current, LessonSchedulingGuard schedulingGuard) {
        this.schedules = schedules;
        this.enrollments = enrollments;
        this.current = current;
        this.schedulingGuard = schedulingGuard;
    }

    public List<Schedule> mySchedules() {
        return schedules.findByEnrollmentTeacherId(current.currentTeacher().getId());
    }

    @Transactional
    public Schedule create(UUID enrollmentId, Weekday weekday, LocalTime startTime, LocalTime endTime) {
        Enrollment e = current.assertOwnedByCurrentTeacher(enrollments.findById(enrollmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Enrollment")));
        EnrollmentRules.requireActive(e);
        Schedule s = new Schedule();
        s.setEnrollment(e);
        s.setWeekday(weekday);
        s.setStartTime(startTime);
        s.setEndTime(endTime);
        schedulingGuard.assertWeeklySlotIsFree(s);
        return schedules.save(s);
    }

    @Transactional
    public Schedule setActive(UUID scheduleId, boolean active) {
        Schedule schedule = schedules.findById(scheduleId)
            .orElseThrow(() -> new ResourceNotFoundException("Schedule"));
        current.assertOwnedByCurrentTeacher(schedule.getEnrollment());
        if (active && !schedule.getActive()) {
            EnrollmentRules.requireActive(schedule.getEnrollment());
            schedulingGuard.assertWeeklySlotIsFree(schedule);
        }
        schedule.setActive(active);
        return schedules.save(schedule);
    }
}
