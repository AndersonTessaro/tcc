package br.com.harmonia.presentation.response;

import br.com.harmonia.infrastructure.persistence.profile.Student;
import br.com.harmonia.infrastructure.persistence.security.User;

import java.util.UUID;

public record PersonSummary(UUID id, String name, String username, UUID userId, boolean hasAvatar) {
    public static PersonSummary of(UUID id, User user) {
        return new PersonSummary(id, user.nameForDisplay(), user.getUsername(), user.getId(), user.hasAvatar());
    }

    public static PersonSummary of(Student student) {
        return of(student.getId(), student.getUser());
    }
}
