package br.com.harmonia.application.lesson.port;

import java.util.UUID;

public record EnrollmentAttendanceAggregate(UUID enrollmentId, long due, long present, long absent,
                                            long excused, long unrecorded) {
    public static final EnrollmentAttendanceAggregate EMPTY = new EnrollmentAttendanceAggregate(null, 0, 0, 0, 0, 0);

    public EnrollmentAttendanceAggregate plus(EnrollmentAttendanceAggregate other) {
        return new EnrollmentAttendanceAggregate(null, due + other.due, present + other.present,
            absent + other.absent, excused + other.excused, unrecorded + other.unrecorded);
    }
}
