package br.com.harmonia.presentation.response;

import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.infrastructure.persistence.schedule.Schedule;
import br.com.harmonia.infrastructure.persistence.schedule.Weekday;

import java.time.LocalTime;
import java.util.UUID;

public record ScheduleResponse(UUID id, UUID enrollmentId, String studentName, String instrument, Weekday weekday,
                               LocalTime startTime, LocalTime endTime, boolean active) {
    public static ScheduleResponse of(Schedule schedule) {
        Enrollment e = schedule.getEnrollment();
        return new ScheduleResponse(schedule.getId(), e.getId(), e.getStudent().getUser().nameForDisplay(),
            e.getInstrument().getName(), schedule.getWeekday(), schedule.getStartTime(), schedule.getEndTime(),
            schedule.getActive());
    }
}
