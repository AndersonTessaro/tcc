package br.com.harmonia.application.schedule;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.application.schedule.port.ScheduleRepository;
import br.com.harmonia.domain.common.OwnershipException;
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

    public ScheduleUseCase(ScheduleRepository schedules, EnrollmentRepository enrollments, CurrentUserService current) {
        this.schedules = schedules;
        this.enrollments = enrollments;
        this.current = current;
    }

    public List<Schedule> mySchedules() {
        return schedules.findByEnrollmentTeacherId(current.currentTeacher().getId());
    }

    @Transactional
    public Schedule create(UUID enrollmentId, Weekday weekday, LocalTime startTime, LocalTime endTime) {
        Enrollment e = enrollments.findById(enrollmentId).orElseThrow();
        if (!e.getTeacher().getId().equals(current.currentTeacher().getId()))
            throw new OwnershipException("Enrollment belongs to another teacher");
        Schedule s = new Schedule();
        s.setEnrollment(e);
        s.setWeekday(weekday);
        s.setStartTime(startTime);
        s.setEndTime(endTime);
        return schedules.save(s);
    }
}
