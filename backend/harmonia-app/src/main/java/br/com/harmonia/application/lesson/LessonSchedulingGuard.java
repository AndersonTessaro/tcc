package br.com.harmonia.application.lesson;

import br.com.harmonia.application.lesson.port.LessonRepository;
import br.com.harmonia.application.schedule.port.ScheduleRepository;
import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.infrastructure.persistence.schedule.Schedule;
import br.com.harmonia.infrastructure.persistence.schedule.Weekday;
import br.com.harmonia.lessoncore.LessonSlot;
import br.com.harmonia.lessoncore.ScheduleConflictException;
import br.com.harmonia.lessoncore.SchedulingPolicy;
import br.com.harmonia.lessoncore.SessionStatus;
import br.com.harmonia.lessoncore.TimeRange;
import br.com.harmonia.lessoncore.WeeklyScheduleSlot;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
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

    // Checks each commitment separately because the policy stops at the first conflict; the preview lists them all.
    public SlotAvailability availability(Enrollment enrollment, LocalDate date, LocalTime startTime,
                                         LocalTime endTime, SessionStatus initialStatus) {
        UUID teacherId = enrollment.getTeacher().getId();
        UUID studentId = enrollment.getStudent().getId();
        List<Lesson> dayLessons = Stream.concat(
                lessons.findByEnrollmentTeacherIdAndDate(teacherId, date).stream(),
                lessons.findByEnrollmentStudentIdAndDate(studentId, date).stream())
            .distinct()
            .filter(lesson -> LessonStatuses.toSessionStatus(lesson.getStatus()) != SessionStatus.CANCELED)
            .sorted(Comparator.comparing(Lesson::getStartTime))
            .toList();
        List<Schedule> dayRecurring = schedules.findByEnrollmentTeacherIdOrEnrollmentStudentId(teacherId, studentId)
            .stream()
            .filter(Schedule::getActive)
            .filter(schedule -> schedule.getWeekday() == Weekday.valueOf(date.getDayOfWeek().name()))
            .sorted(Comparator.comparing(Schedule::getStartTime))
            .toList();

        SlotAvailability.Block fulfilled = dayRecurring.stream()
            .filter(schedule -> isSamePair(schedule.getEnrollment(), teacherId, studentId))
            .findFirst()
            .map(schedule -> recurringBlock(schedule, teacherId, studentId))
            .orElse(null);

        List<SlotAvailability.Block> busy = new ArrayList<>();
        dayLessons.forEach(lesson -> busy.add(lessonBlock(lesson, teacherId, studentId)));
        dayRecurring.stream()
            .filter(schedule -> !isSamePair(schedule.getEnrollment(), teacherId, studentId))
            .forEach(schedule -> busy.add(recurringBlock(schedule, teacherId, studentId)));
        busy.sort(Comparator.comparing(SlotAvailability.Block::startTime));

        List<SlotAvailability.Block> conflicts = new ArrayList<>();
        if (startTime != null && endTime != null) {
            LessonSlot candidate = new LessonSlot(UUID.randomUUID(), teacherId, studentId, date,
                new TimeRange(startTime, endTime), initialStatus);
            for (Lesson lesson : dayLessons) {
                if (conflicts(() -> policy.validateLessonSlot(candidate, List.of(toSlot(lesson))))) {
                    conflicts.add(lessonBlock(lesson, teacherId, studentId));
                }
            }
            for (Schedule schedule : dayRecurring) {
                if (conflicts(() -> policy.validateLessonAgainstWeeklySchedules(candidate,
                        List.of(toWeeklySlot(schedule))))) {
                    conflicts.add(recurringBlock(schedule, teacherId, studentId));
                }
            }
        }
        return new SlotAvailability(initialStatus, List.copyOf(busy), List.copyOf(conflicts), fulfilled);
    }

    private static boolean isSamePair(Enrollment e, UUID teacherId, UUID studentId) {
        return e.getTeacher().getId().equals(teacherId) && e.getStudent().getId().equals(studentId);
    }

    private static boolean conflicts(Runnable validation) {
        try {
            validation.run();
            return false;
        } catch (ScheduleConflictException conflict) {
            return true;
        }
    }

    // A student's commitment with another teacher is shown only as busy time: its details belong to that teacher.
    private static SlotAvailability.Block lessonBlock(Lesson lesson, UUID teacherId, UUID studentId) {
        Enrollment e = lesson.getEnrollment();
        String description = e.getTeacher().getId().equals(teacherId)
            ? e.getStudent().getUser().nameForDisplay() + " · " + e.getInstrument().getName()
            : "Aula do aluno com outro professor";
        return new SlotAvailability.Block(lesson.getId(), SlotAvailability.Kind.LESSON,
            partyOf(e, teacherId, studentId), lesson.getStartTime(), lesson.getEndTime(), description);
    }

    private static SlotAvailability.Block recurringBlock(Schedule schedule, UUID teacherId, UUID studentId) {
        Enrollment e = schedule.getEnrollment();
        String description = e.getTeacher().getId().equals(teacherId)
            ? "Horário fixo · " + e.getStudent().getUser().nameForDisplay()
            : "Horário fixo do aluno com outro professor";
        return new SlotAvailability.Block(schedule.getId(), SlotAvailability.Kind.RECURRING,
            partyOf(e, teacherId, studentId), schedule.getStartTime(), schedule.getEndTime(), description);
    }

    private static SlotAvailability.Party partyOf(Enrollment e, UUID teacherId, UUID studentId) {
        boolean teacher = e.getTeacher().getId().equals(teacherId);
        boolean student = e.getStudent().getId().equals(studentId);
        if (teacher && student) return SlotAvailability.Party.BOTH;
        return teacher ? SlotAvailability.Party.TEACHER : SlotAvailability.Party.STUDENT;
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
