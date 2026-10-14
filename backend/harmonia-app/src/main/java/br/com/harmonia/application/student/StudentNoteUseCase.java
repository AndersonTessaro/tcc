package br.com.harmonia.application.student;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.profile.port.TeacherStudentNoteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class StudentNoteUseCase {
    private final TeacherStudentNoteRepository notes;
    private final CurrentUserService current;

    public StudentNoteUseCase(TeacherStudentNoteRepository notes, CurrentUserService current) {
        this.notes = notes;
        this.current = current;
    }

    public record SharedNote(String teacherName, String notes, Instant updatedAt) {}

    @Transactional(readOnly = true)
    public List<SharedNote> sharedWithMe() {
        return notes.findByStudentIdAndSharedNotesIsNotNullOrderByUpdatedAtDesc(current.currentStudent().getId())
            .stream().map(note -> new SharedNote(note.getTeacher().getUser().nameForDisplay(),
                note.getSharedNotes(), note.getUpdatedAt().toInstant(ZoneOffset.UTC))).toList();
    }
}
