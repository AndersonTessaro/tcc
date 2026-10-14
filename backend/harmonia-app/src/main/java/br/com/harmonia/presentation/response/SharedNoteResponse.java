package br.com.harmonia.presentation.response;

import br.com.harmonia.application.student.StudentNoteUseCase.SharedNote;

import java.time.Instant;

public record SharedNoteResponse(String teacherName, String notes, Instant updatedAt) {
    public static SharedNoteResponse of(SharedNote note) {
        return new SharedNoteResponse(note.teacherName(), note.notes(), note.updatedAt());
    }
}
