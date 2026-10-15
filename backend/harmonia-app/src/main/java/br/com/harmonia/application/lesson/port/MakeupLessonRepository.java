package br.com.harmonia.application.lesson.port;

import br.com.harmonia.infrastructure.persistence.lesson.MakeupLesson;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MakeupLessonRepository extends JpaRepository<MakeupLesson, UUID> {
    @EntityGraph(attributePaths = {"originalLesson", "newLesson.enrollment.student.user", "newLesson.enrollment.instrument"})
    @Query("""
        select m from MakeupLesson m
        where m.originalLesson.enrollment.teacher.id = :teacherId
          and m.newLesson.enrollment.teacher.id = :teacherId
          and m.newLesson.date between :from and :to
        order by m.newLesson.date, m.newLesson.startTime, m.id
        """)
    List<MakeupLesson> findForTeacher(UUID teacherId, LocalDate from, LocalDate to);

    boolean existsByOriginalLessonId(UUID originalLessonId);
    Optional<MakeupLesson> findByOriginalLessonId(UUID originalLessonId);
}
