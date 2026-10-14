package br.com.harmonia.presentation.response;

import br.com.harmonia.application.teacher.TeacherStudentUseCase.StudentProfile;

import java.util.UUID;

public record StudentProfileResponse(UUID id, String name, String username, String email, String phone,
                                     String privateNotes, String sharedNotes) {
    public static StudentProfileResponse of(StudentProfile profile) {
        return new StudentProfileResponse(profile.id(), profile.name(), profile.username(), profile.email(),
            profile.phone(), profile.privateNotes(), profile.sharedNotes());
    }
}
