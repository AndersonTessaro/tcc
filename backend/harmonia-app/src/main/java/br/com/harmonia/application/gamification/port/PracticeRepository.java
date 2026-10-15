package br.com.harmonia.application.gamification.port;

import br.com.harmonia.infrastructure.persistence.gamification.Practice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Collection;
import java.util.UUID;

public interface PracticeRepository extends JpaRepository<Practice, UUID> {
    List<Practice> findByStudentIdAndDateBetween(UUID studentId, LocalDate start, LocalDate end);

    List<Practice> findTop100ByStudentIdOrderByDateDescCreatedAtDesc(UUID studentId);
    List<Practice> findTop1000ByStudentIdOrderByDateDescCreatedAtDesc(UUID studentId);
    List<Practice> findByStudentIdInAndDateBetween(Collection<UUID> studentIds, LocalDate start, LocalDate end);

    @Query("""
        select new br.com.harmonia.application.gamification.port.StudentPracticeAggregate(
            p.student.id, count(p), sum(p.durationMin), count(distinct p.date), sum(p.rating), count(p.rating), max(p.date))
        from Practice p
        where p.student.id in :studentIds and p.date between :from and :to
        group by p.student.id""")
    List<StudentPracticeAggregate> practiceByStudent(Collection<UUID> studentIds, LocalDate from, LocalDate to);

    @Query("""
        select new br.com.harmonia.application.gamification.port.DailyPracticeMinutes(p.date, sum(p.durationMin))
        from Practice p
        where p.student.id in :studentIds and p.date between :from and :to
        group by p.date""")
    List<DailyPracticeMinutes> dailyMinutes(Collection<UUID> studentIds, LocalDate from, LocalDate to);
}
