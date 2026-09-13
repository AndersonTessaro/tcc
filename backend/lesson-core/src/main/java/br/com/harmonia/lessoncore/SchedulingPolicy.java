package br.com.harmonia.lessoncore;

import java.util.Collection;
import java.util.Objects;
import java.time.DayOfWeek;

/** Validates time ranges and prevents a teacher or student from being double-booked. */
public final class SchedulingPolicy {

    public void validateLessonSlot(LessonSlot candidate, Collection<LessonSlot> existingSlots) {
        Objects.requireNonNull(candidate, "candidate is required");
        Objects.requireNonNull(existingSlots, "existingSlots is required");
        for (LessonSlot existing : existingSlots) {
            if (existing.status() != SessionStatus.CANCELED
                && !existing.lessonId().equals(candidate.lessonId())
                && existing.date().equals(candidate.date())
                && existing.timeRange().overlaps(candidate.timeRange())
                && (existing.teacherId().equals(candidate.teacherId())
                    || existing.studentId().equals(candidate.studentId()))) {
                throw new ScheduleConflictException("Teacher or student already has a lesson in this time range");
            }
        }
    }

    public void validateWeeklySlot(WeeklyScheduleSlot candidate, Collection<WeeklyScheduleSlot> existingSlots) {
        Objects.requireNonNull(candidate, "candidate is required");
        Objects.requireNonNull(existingSlots, "existingSlots is required");
        for (WeeklyScheduleSlot existing : existingSlots) {
            if (!existing.scheduleId().equals(candidate.scheduleId())
                && existing.weekday() == candidate.weekday()
                && existing.timeRange().overlaps(candidate.timeRange())
                && (existing.teacherId().equals(candidate.teacherId())
                    || existing.studentId().equals(candidate.studentId()))) {
                throw new ScheduleConflictException("Teacher or student already has a recurring schedule in this time range");
            }
        }
    }

    /** Prevents a concrete lesson from being created inside an active recurring reservation. */
    public void validateLessonAgainstWeeklySchedules(LessonSlot candidate,
                                                      Collection<WeeklyScheduleSlot> recurringSlots) {
        Objects.requireNonNull(candidate, "candidate is required");
        Objects.requireNonNull(recurringSlots, "recurringSlots is required");
        DayOfWeek weekday = candidate.date().getDayOfWeek();
        for (WeeklyScheduleSlot recurring : recurringSlots) {
            if (recurring.weekday() == weekday
                && recurring.timeRange().overlaps(candidate.timeRange())
                && (recurring.teacherId().equals(candidate.teacherId())
                    || recurring.studentId().equals(candidate.studentId()))) {
                throw new ScheduleConflictException("Lesson conflicts with a recurring schedule");
            }
        }
    }
}
