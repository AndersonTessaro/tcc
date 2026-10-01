package br.com.harmonia.application.teacher;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.gamification.port.GoalRepository;
import br.com.harmonia.application.gamification.port.ProgressRepository;
import br.com.harmonia.application.gamification.port.PracticeRepository;
import br.com.harmonia.application.lesson.port.AttendanceRepository;
import br.com.harmonia.application.lesson.port.LessonRepository;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.domain.common.OwnershipException;
import br.com.harmonia.infrastructure.persistence.gamification.GoalStatus;
import br.com.harmonia.infrastructure.persistence.gamification.Practice;
import br.com.harmonia.infrastructure.persistence.lesson.Lesson;
import br.com.harmonia.infrastructure.persistence.lesson.LessonStatus;
import br.com.harmonia.infrastructure.persistence.lesson.AttendanceStatus;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.infrastructure.persistence.profile.EnrollmentStatus;
import br.com.harmonia.infrastructure.persistence.profile.Student;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class TeacherUseCase {
    private final EnrollmentRepository enrollments;
    private final ProgressRepository progresses;
    private final LessonRepository lessons;
    private final AttendanceRepository attendances;
    private final GoalRepository goals;
    private final CurrentUserService current;
    private final PracticeRepository practices;

    public TeacherUseCase(EnrollmentRepository enrollments, ProgressRepository progresses,
                          LessonRepository lessons, AttendanceRepository attendances,
                          GoalRepository goals, CurrentUserService current,
                          PracticeRepository practices) {
        this.enrollments = enrollments;
        this.progresses = progresses;
        this.lessons = lessons;
        this.attendances = attendances;
        this.goals = goals;
        this.current = current;
        this.practices = practices;
    }

    public record DashboardSummary(int totalStudents, int attendancePercent, int weeklyPracticeMin,
                                   List<String> classes, String selectedClass, List<Lesson> todayLessons,
                                   List<Lesson> upcomingLessons) {}

    @Transactional(readOnly = true)
    public DashboardSummary dashboard(String requestedClass) {
        UUID teacherId = current.currentTeacher().getId();
        List<Enrollment> activeEnrollments = myActiveEnrollments();
        List<String> classes = activeEnrollments.stream().map(e -> {
            String instrument = e.getInstrument().getName();
            return e.getClassGroup() == null ? instrument : instrument + " - " + e.getClassGroup().getName();
        }).distinct().toList();
        String selectedClass = classes.contains(requestedClass) ? requestedClass : classes.stream().findFirst().orElse("");
        List<Enrollment> selectedEnrollments = activeEnrollments.stream().filter(e -> {
            String instrument = e.getInstrument().getName();
            String name = e.getClassGroup() == null ? instrument : instrument + " - " + e.getClassGroup().getName();
            return name.equals(selectedClass);
        }).toList();
        List<UUID> enrollmentIds = selectedEnrollments.stream().map(Enrollment::getId).toList();
        List<UUID> studentIds = selectedEnrollments.stream().map(e -> e.getStudent().getId()).distinct().toList();

        long present = enrollmentIds.isEmpty() ? 0 : attendances.countByLessonEnrollmentIdInAndStatus(enrollmentIds, AttendanceStatus.PRESENT);
        long absent = enrollmentIds.isEmpty() ? 0 : attendances.countByLessonEnrollmentIdInAndStatus(enrollmentIds, AttendanceStatus.ABSENT);
        long excused = enrollmentIds.isEmpty() ? 0 : attendances.countByLessonEnrollmentIdInAndStatus(enrollmentIds, AttendanceStatus.EXCUSED);
        long recorded = present + absent + excused;
        int attendancePercent = recorded == 0 ? 0 : (int) Math.round(100.0 * present / recorded);

        LocalDate today = LocalDate.now();
        int weeklyPracticeMin = studentIds.isEmpty() ? 0 : practices.findByStudentIdInAndDateBetween(
            studentIds, today.with(DayOfWeek.MONDAY), today).stream().mapToInt(Practice::getDurationMin).sum();
        List<Lesson> todayLessons = lessons.findByEnrollmentTeacherIdAndDate(teacherId, today).stream()
            .filter(item -> enrollmentIds.contains(item.getEnrollment().getId()) && item.getStatus() != LessonStatus.CANCELED)
            .sorted(Comparator.comparing(Lesson::getStartTime)).toList();
        List<Lesson> upcomingLessons = lessons.findByEnrollmentTeacherIdAndDateGreaterThanEqual(teacherId, today)
            .stream().filter(item -> enrollmentIds.contains(item.getEnrollment().getId()) && item.getStatus() == LessonStatus.SCHEDULED)
            .sorted(Comparator.comparing(Lesson::getDate).thenComparing(Lesson::getStartTime))
            .limit(3).toList();
        return new DashboardSummary(studentIds.size(), attendancePercent, weeklyPracticeMin,
            classes, selectedClass, todayLessons, upcomingLessons);
    }

    public List<Enrollment> myActiveEnrollments() {
        return enrollments.findByTeacherId(current.currentTeacher().getId()).stream()
            .filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE).toList();
    }

    public List<Student> linkedStudents() {
        return enrollments.findByTeacherId(current.currentTeacher().getId()).stream()
            .map(Enrollment::getStudent).distinct().toList();
    }

    public List<Lesson> studentLessons(UUID studentId) {
        assertLinked(studentId);
        return lessons.findByEnrollmentStudentIdOrderByDateDesc(studentId).stream()
            .filter(l -> current.isAdmin() || l.getEnrollment().getTeacher().getId()
                .equals(current.currentTeacher().getId()))
            .limit(100).toList();
    }

    private void assertLinked(UUID studentId) {
        if (!current.isAdmin()
                && enrollments.findByTeacherIdAndStudentId(current.currentTeacher().getId(), studentId).isEmpty())
            throw new OwnershipException("Student not linked");
    }

    /** Pedagogical report for a linked student (RF12/RF18). */
    public Map<String, Object> studentDetail(UUID studentId) {
        assertLinked(studentId);

        long present = attendances.countByLessonEnrollmentStudentIdAndStatus(studentId, AttendanceStatus.PRESENT);
        long absent = attendances.countByLessonEnrollmentStudentIdAndStatus(studentId, AttendanceStatus.ABSENT);
        long excused = attendances.countByLessonEnrollmentStudentIdAndStatus(studentId, AttendanceStatus.EXCUSED);
        long recorded = present + absent + excused;
        int attendanceRate = recorded == 0 ? 0 : (int) Math.round(100.0 * present / recorded);

        Map<String, Object> attendance = new HashMap<>();
        attendance.put("present", present);
        attendance.put("absent", absent);
        attendance.put("excused", excused);
        attendance.put("rate", attendanceRate);

        Map<String, Object> goalsSummary = new HashMap<>();
        goalsSummary.put("active", goals.countByStudentIdAndStatus(studentId, GoalStatus.ACTIVE));
        goalsSummary.put("completed", goals.countByStudentIdAndStatus(studentId, GoalStatus.COMPLETED));

        Map<String, Object> body = new HashMap<>();
        body.put("studentId", studentId);
        body.put("progress", progresses.findByStudentId(studentId).orElse(null));
        body.put("lessonsCount", lessons.countByEnrollmentStudentId(studentId));
        body.put("attendance", attendance);
        body.put("goals", goalsSummary);
        LocalDate today = LocalDate.now();
        body.put("weeklyPracticeMin", practices.findByStudentIdAndDateBetween(
            studentId, today.with(DayOfWeek.MONDAY), today).stream()
            .mapToInt(Practice::getDurationMin).sum());
        body.put("recentPractices", practices.findTop100ByStudentIdOrderByDateDescCreatedAtDesc(studentId)
            .stream().limit(10).map(p -> Map.of(
                "date", p.getDate(), "durationMin", p.getDurationMin(),
                "notes", p.getNotes() == null ? "" : p.getNotes())).toList());
        body.put("attendanceHistory", attendances
            .findTop100ByLessonEnrollmentStudentIdOrderByLessonDateDesc(studentId).stream()
            .map(a -> Map.of("date", a.getLesson().getDate(), "status", a.getStatus())).toList());
        body.put("nextGoal", goals.findByStudentIdAndStatus(studentId, GoalStatus.ACTIVE).stream()
            .min(Comparator.comparing(g -> g.getDeadline() == null ? LocalDate.MAX : g.getDeadline()))
            .map(g -> g.getTitle()).orElse(""));
        List<Enrollment> studentEnrollments = current.isAdmin()
            ? enrollments.findByStudentId(studentId)
            : enrollments.findByTeacherIdAndStudentId(current.currentTeacher().getId(), studentId);
        body.put("enrollmentDate", studentEnrollments.stream()
            .map(Enrollment::getStartDate).min(LocalDate::compareTo).orElse(today));
        return body;
    }
}
