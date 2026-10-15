package br.com.harmonia.application.teacher;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.gamification.port.DailyPracticeMinutes;
import br.com.harmonia.application.gamification.port.PracticeRepository;
import br.com.harmonia.application.gamification.port.StudentPracticeAggregate;
import br.com.harmonia.application.lesson.port.EnrollmentAttendanceAggregate;
import br.com.harmonia.application.lesson.port.LessonRepository;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.domain.report.ReportMath;
import br.com.harmonia.domain.report.ReportMath.WeekTotal;
import br.com.harmonia.domain.report.ReportPeriod;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.infrastructure.persistence.profile.EnrollmentStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.function.Function;

import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.toList;
import static java.util.stream.Collectors.toMap;

@Service
@Transactional(readOnly = true)
public class TeacherReportUseCase {
    private final EnrollmentRepository enrollments;
    private final LessonRepository lessons;
    private final PracticeRepository practices;
    private final CurrentUserService current;

    public TeacherReportUseCase(EnrollmentRepository enrollments, LessonRepository lessons,
                                PracticeRepository practices, CurrentUserService current) {
        this.enrollments = enrollments;
        this.lessons = lessons;
        this.practices = practices;
        this.current = current;
    }

    public record AttendanceCounts(long due, long present, long absent, long excused, long unrecorded, Integer rate) {
        static AttendanceCounts of(EnrollmentAttendanceAggregate a) {
            return new AttendanceCounts(a.due(), a.present(), a.absent(), a.excused(), a.unrecorded(),
                ReportMath.percent(a.present(), a.due()));
        }
    }
    public record StudentAttendance(UUID studentId, String studentName, boolean active, AttendanceCounts attendance) {}
    public record AttendanceReport(LocalDate from, LocalDate to, AttendanceCounts totals, List<StudentAttendance> students) {}

    public record PracticeTotals(long totalMinutes, long sessions, int practicingStudents, int linkedStudents, Double avgRating) {}
    public record StudentPractice(UUID studentId, String studentName, long minutes, long sessions, long practiceDays,
                                  Double avgRating, LocalDate lastPractice) {}
    public record PracticeReport(LocalDate from, LocalDate to, PracticeTotals totals, List<WeekTotal> weeks,
                                 List<StudentPractice> students) {}

    public record ClassPerformance(String name, int students, AttendanceCounts attendance, long practiceMinutes,
                                   long avgPracticeMinPerStudent, Double avgRating) {}
    public record ClassReport(LocalDate from, LocalDate to, List<ClassPerformance> groups) {}

    public AttendanceReport attendance(ReportPeriod period) {
        UUID teacherId = current.currentTeacher().getId();
        Map<UUID, EnrollmentAttendanceAggregate> counts = attendanceByEnrollment(teacherId, period);
        List<StudentAttendance> rows = new ArrayList<>();
        var total = EnrollmentAttendanceAggregate.EMPTY;
        for (List<Enrollment> group : byStudent(enrollments.findByTeacherId(teacherId)).values()) {
            var sum = sumAttendance(group, counts);
            boolean active = group.stream().anyMatch(TeacherReportUseCase::isActive);
            if (!active && sum.due() == 0) continue;
            Enrollment first = group.getFirst();
            rows.add(new StudentAttendance(first.getStudent().getId(), studentName(first), active, AttendanceCounts.of(sum)));
            total = total.plus(sum);
        }
        rows.sort(Comparator.comparing((StudentAttendance r) -> r.attendance().rate(),
                Comparator.nullsLast(Comparator.naturalOrder()))
            .thenComparing(StudentAttendance::studentName));
        return new AttendanceReport(period.from(), period.to(), AttendanceCounts.of(total), rows);
    }

    public PracticeReport practice(ReportPeriod period) {
        Map<UUID, List<Enrollment>> students = byStudent(activeEnrollments());
        Map<UUID, StudentPracticeAggregate> practice = practiceByStudent(students.keySet(), period);
        Map<LocalDate, Long> daily = students.isEmpty() ? Map.of()
            : practices.dailyMinutes(students.keySet(), period.from(), period.to()).stream()
                .collect(toMap(DailyPracticeMinutes::date, DailyPracticeMinutes::minutes));

        List<StudentPractice> rows = new ArrayList<>();
        long minutes = 0, sessions = 0, ratingSum = 0, ratingCount = 0;
        int practicing = 0;
        for (var entry : students.entrySet()) {
            var p = practice.getOrDefault(entry.getKey(), StudentPracticeAggregate.empty(entry.getKey()));
            rows.add(new StudentPractice(entry.getKey(), studentName(entry.getValue().getFirst()), p.minutes(),
                p.sessions(), p.practiceDays(), ReportMath.average(p.ratingTotal(), p.ratingCount()), p.lastPractice()));
            minutes += p.minutes();
            sessions += p.sessions();
            ratingSum += p.ratingTotal();
            ratingCount += p.ratingCount();
            if (p.sessions() > 0) practicing++;
        }
        rows.sort(Comparator.comparingLong(StudentPractice::minutes).thenComparing(StudentPractice::studentName));
        var totals = new PracticeTotals(minutes, sessions, practicing, students.size(), ReportMath.average(ratingSum, ratingCount));
        return new PracticeReport(period.from(), period.to(), totals, ReportMath.weekly(daily, period), rows);
    }

    // A student in two groups counts their practice in both: practice has no enrollment.
    public ClassReport classes(ReportPeriod period) {
        UUID teacherId = current.currentTeacher().getId();
        List<Enrollment> active = activeEnrollments();
        Map<UUID, EnrollmentAttendanceAggregate> counts = attendanceByEnrollment(teacherId, period);
        Map<UUID, StudentPracticeAggregate> practice = practiceByStudent(byStudent(active).keySet(), period);

        List<ClassPerformance> rows = new ArrayList<>();
        active.stream().collect(groupingBy(Enrollment::classLabel, TreeMap::new, toList())).forEach((name, group) -> {
            var students = byStudent(group).keySet();
            long minutes = 0, ratingSum = 0, ratingCount = 0;
            for (UUID id : students) {
                var p = practice.getOrDefault(id, StudentPracticeAggregate.empty(id));
                minutes += p.minutes();
                ratingSum += p.ratingTotal();
                ratingCount += p.ratingCount();
            }
            rows.add(new ClassPerformance(name, students.size(), AttendanceCounts.of(sumAttendance(group, counts)),
                minutes, Math.round((double) minutes / students.size()), ReportMath.average(ratingSum, ratingCount)));
        });
        return new ClassReport(period.from(), period.to(), rows);
    }

    private List<Enrollment> activeEnrollments() {
        return enrollments.findByTeacherId(current.currentTeacher().getId()).stream()
            .filter(TeacherReportUseCase::isActive).toList();
    }

    private Map<UUID, EnrollmentAttendanceAggregate> attendanceByEnrollment(UUID teacherId, ReportPeriod period) {
        return lessons.attendanceByEnrollment(teacherId, period.from(), period.to(), LocalDate.now()).stream()
            .collect(toMap(EnrollmentAttendanceAggregate::enrollmentId, Function.identity()));
    }

    private Map<UUID, StudentPracticeAggregate> practiceByStudent(Collection<UUID> studentIds, ReportPeriod period) {
        if (studentIds.isEmpty()) return Map.of();
        return practices.practiceByStudent(studentIds, period.from(), period.to()).stream()
            .collect(toMap(StudentPracticeAggregate::studentId, Function.identity()));
    }

    private static EnrollmentAttendanceAggregate sumAttendance(List<Enrollment> group,
                                                               Map<UUID, EnrollmentAttendanceAggregate> counts) {
        return group.stream().map(e -> counts.getOrDefault(e.getId(), EnrollmentAttendanceAggregate.EMPTY))
            .reduce(EnrollmentAttendanceAggregate.EMPTY, EnrollmentAttendanceAggregate::plus);
    }

    private static Map<UUID, List<Enrollment>> byStudent(List<Enrollment> list) {
        return list.stream().collect(groupingBy(e -> e.getStudent().getId(), LinkedHashMap::new, toList()));
    }

    private static boolean isActive(Enrollment e) {
        return e.getStatus() == EnrollmentStatus.ACTIVE;
    }

    private static String studentName(Enrollment e) {
        return e.getStudent().getUser().nameForDisplay();
    }
}
