package br.com.harmonia.application.teacher;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.gamification.port.GoalRepository;
import br.com.harmonia.application.gamification.port.ProgressRepository;
import br.com.harmonia.application.lesson.port.AttendanceRepository;
import br.com.harmonia.application.lesson.port.LessonRepository;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.domain.common.OwnershipException;
import br.com.harmonia.infrastructure.persistence.gamification.GoalStatus;
import br.com.harmonia.infrastructure.persistence.lesson.AttendanceStatus;
import br.com.harmonia.infrastructure.persistence.profile.Enrollment;
import br.com.harmonia.infrastructure.persistence.profile.Student;
import org.springframework.stereotype.Service;

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

    public TeacherUseCase(EnrollmentRepository enrollments, ProgressRepository progresses,
                          LessonRepository lessons, AttendanceRepository attendances,
                          GoalRepository goals, CurrentUserService current) {
        this.enrollments = enrollments;
        this.progresses = progresses;
        this.lessons = lessons;
        this.attendances = attendances;
        this.goals = goals;
        this.current = current;
    }

    public List<Student> linkedStudents() {
        return enrollments.findByTeacherId(current.currentTeacher().getId()).stream()
            .map(Enrollment::getStudent).distinct().toList();
    }

    /** Pedagogical report for a linked student (RF12/RF18). */
    public Map<String, Object> studentDetail(UUID studentId) {
        var teacherId = current.currentTeacher().getId();
        if (enrollments.findByTeacherIdAndStudentId(teacherId, studentId).isEmpty())
            throw new OwnershipException("Student not linked");

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
        return body;
    }

    public Map<String, Object> dashboard() {
        var students = linkedStudents();
        return Map.of("totalStudents", students.size(), "students", students);
    }
}
