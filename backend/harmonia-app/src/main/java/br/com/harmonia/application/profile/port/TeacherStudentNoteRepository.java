package br.com.harmonia.application.profile.port;

import br.com.harmonia.infrastructure.persistence.profile.TeacherStudentNote;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TeacherStudentNoteRepository extends JpaRepository<TeacherStudentNote, UUID> {
    Optional<TeacherStudentNote> findByTeacherIdAndStudentId(UUID teacherId, UUID studentId);

    @EntityGraph(attributePaths = {"teacher", "teacher.user"})
    List<TeacherStudentNote> findByStudentIdAndSharedNotesIsNotNullOrderByUpdatedAtDesc(UUID studentId);
}
