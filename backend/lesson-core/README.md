# lesson-core

`lesson-core` is a plain-Java domain library for systems that manage individual lessons. It deliberately has no dependency on Spring, JPA, HTTP, or a database.

## Public model

- `TimeRange` validates that a lesson has a real, non-empty interval and implements exclusive-end overlap detection.
- `LessonSlot` and `WeeklyScheduleSlot` are immutable scheduling inputs, independent of persistence entities.
- `SchedulingPolicy` prevents double bookings for either the teacher or the student. Canceled one-off lessons do not block a slot; inactive recurring schedules are filtered by the adapter before calling the policy.
- `LessonLifecyclePolicy` centralizes allowed status transitions: `SCHEDULED -> DONE | CANCELED`. `DONE` and `CANCELED` are terminal.
- `AttendanceRecordingRule` maps an attendance transition to an `AttendanceEffect` (`AWARD_XP`, `REVOKE_XP` or `NONE`); consumers apply the effect once as part of their transaction. Re-recording the same outcome yields `NONE`, so the rule is idempotent and corrections are reversible.
- `MakeupLinkValidator` guarantees that only one completed original lesson can create a makeup.

## Adapter contract

An application maps its persistence objects to the immutable core records, fetches all potentially conflicting teacher and student slots, and calls the policy before persistence. The core never receives a repository or publishes framework events.

```java
var candidate = new LessonSlot(id, teacherId, studentId, date,
    new TimeRange(start, end), SessionStatus.SCHEDULED);
schedulingPolicy.validateLessonSlot(candidate, existingSlots);
```

All core exceptions derive from `DomainValidationException`; `ScheduleConflictException` identifies a conflict that can be exposed as HTTP 409 by a web adapter.
