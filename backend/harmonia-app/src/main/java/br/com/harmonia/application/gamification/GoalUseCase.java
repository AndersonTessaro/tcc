package br.com.harmonia.application.gamification;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.gamification.port.GoalRepository;
import br.com.harmonia.application.profile.port.StudentRepository;
import br.com.harmonia.application.teacher.StudentLinkGuard;
import br.com.harmonia.domain.common.OwnershipException;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.domain.gamification.GoalPeriod;
import br.com.harmonia.domain.gamification.GoalProgressCalculator.Progress;
import br.com.harmonia.infrastructure.persistence.gamification.Goal;
import br.com.harmonia.infrastructure.persistence.gamification.GoalStatus;
import br.com.harmonia.infrastructure.persistence.gamification.GoalType;
import br.com.harmonia.infrastructure.persistence.profile.Student;
import br.com.harmonia.infrastructure.persistence.profile.Teacher;
import br.com.harmonia.lessoncore.DomainValidationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Predicate;

@Service
public class GoalUseCase {
    private final GoalRepository goals;
    private final StudentRepository students;
    private final GoalProgressService progress;
    private final CurrentUserService current;
    private final StudentLinkGuard links;

    public GoalUseCase(GoalRepository goals, StudentRepository students, GoalProgressService progress,
                       CurrentUserService current, StudentLinkGuard links) {
        this.goals = goals;
        this.students = students;
        this.progress = progress;
        this.current = current;
        this.links = links;
    }

    public record NewGoal(String title, String description, GoalType type, GoalPeriod period, int target) {}

    public record GoalView(Goal goal, Progress progress, boolean canEnd) {}

    @Transactional(readOnly = true)
    public List<GoalView> listMine(GoalStatus status) {
        return views(current.currentStudent().getId(), status, this::studentCanEnd);
    }

    @Transactional
    public GoalView createForMe(NewGoal command) {
        return view(create(current.currentStudent(), null, command), this::studentCanEnd);
    }

    @Transactional
    public GoalView endMine(UUID goalId) {
        Goal goal = find(goalId);
        current.assertOwnedByCurrentStudent(goal.getStudent());
        if (goal.getStatus() == GoalStatus.ACTIVE && !studentCanEnd(goal))
            throw new OwnershipException("Goal set by teacher");
        return view(end(goal), this::studentCanEnd);
    }

    @Transactional(readOnly = true)
    public List<GoalView> listForStudent(UUID studentId, GoalStatus status) {
        links.assertLinked(studentId);
        return views(studentId, status, this::teacherCanEnd);
    }

    @Transactional
    public GoalView createForStudent(UUID studentId, NewGoal command) {
        assertCanManage(studentId);
        Student student = students.findById(studentId).orElseThrow(() -> new ResourceNotFoundException("Student"));
        Teacher author = current.isAdmin() ? null : current.currentTeacher();
        return view(create(student, author, command), this::teacherCanEnd);
    }

    @Transactional
    public GoalView endForStudent(UUID studentId, UUID goalId) {
        assertCanManage(studentId);
        Goal goal = find(goalId);
        if (!goal.getStudent().getId().equals(studentId)) throw new ResourceNotFoundException("Goal");
        if (goal.getStatus() == GoalStatus.ACTIVE && !teacherCanEnd(goal))
            throw new OwnershipException("Goal set by someone else");
        return view(end(goal), this::teacherCanEnd);
    }

    private void assertCanManage(UUID studentId) {
        if (!current.isAdmin()) links.assertActivelyLinked(studentId);
    }

    private Goal create(Student student, Teacher author, NewGoal command) {
        if (command.type().isLegacy()) throw new DomainValidationException("Goal type is no longer supported");
        if (command.type() == GoalType.PRACTICE_DAYS && command.target() > command.period().maxDays())
            throw new DomainValidationException("Practice days goal exceeds the days in the period");
        Goal goal = new Goal();
        goal.setStudent(student);
        goal.setCreatedByTeacher(author);
        goal.setTitle(command.title());
        goal.setDescription(command.description());
        goal.setType(command.type());
        goal.setPeriod(command.period());
        goal.setTarget(command.target());
        return goals.save(goal);
    }

    private Goal end(Goal goal) {
        if (goal.getStatus() != GoalStatus.ACTIVE) return goal;
        goal.setStatus(GoalStatus.ENDED);
        goal.setEndedAt(LocalDateTime.now());
        return goals.save(goal);
    }

    private Goal find(UUID goalId) {
        return goals.findById(goalId).orElseThrow(() -> new ResourceNotFoundException("Goal"));
    }

    private boolean studentCanEnd(Goal goal) {
        return goal.getStatus() == GoalStatus.ACTIVE && (goal.getCreatedByTeacher() == null || current.isAdmin());
    }

    private boolean teacherCanEnd(Goal goal) {
        return goal.getStatus() == GoalStatus.ACTIVE && (current.isAdmin() || goal.getCreatedByTeacher() != null
            && goal.getCreatedByTeacher().getId().equals(current.currentTeacher().getId()));
    }

    private List<GoalView> views(UUID studentId, GoalStatus status, Predicate<Goal> canEnd) {
        List<Goal> found = status == null ? goals.findByStudentId(studentId)
            : status == GoalStatus.ACTIVE ? goals.findByStudentIdAndStatus(studentId, GoalStatus.ACTIVE)
            : goals.findByStudentIdAndStatusIn(studentId, List.of(GoalStatus.ENDED, GoalStatus.COMPLETED));
        Map<UUID, Progress> computed = progress.progressOf(studentId, found);
        return found.stream()
            .sorted(Comparator.comparing(Goal::getCreatedAt).reversed())
            .map(goal -> new GoalView(goal, computed.get(goal.getId()), canEnd.test(goal)))
            .toList();
    }

    private GoalView view(Goal goal, Predicate<Goal> canEnd) {
        return new GoalView(goal, progress.progressOf(goal.getStudent().getId(), List.of(goal)).get(goal.getId()),
            canEnd.test(goal));
    }
}
