package br.com.harmonia.application.account;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.application.profile.port.StudentRepository;
import br.com.harmonia.application.profile.port.TeacherRepository;
import br.com.harmonia.application.security.port.UserRepository;
import br.com.harmonia.application.storage.StorageTransactions;
import br.com.harmonia.domain.common.FileSignatures;
import br.com.harmonia.domain.common.OwnershipException;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.infrastructure.persistence.security.User;
import br.com.harmonia.infrastructure.storage.FileStoragePort;
import br.com.harmonia.lessoncore.DomainValidationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class AvatarUseCase {
    public static final long MAX_BYTES = 2 * 1024 * 1024;
    private final CurrentUserService current;
    private final UserRepository users;
    private final StudentRepository students;
    private final TeacherRepository teachers;
    private final EnrollmentRepository enrollments;
    private final FileStoragePort storage;

    public AvatarUseCase(CurrentUserService current, UserRepository users, StudentRepository students,
                         TeacherRepository teachers, EnrollmentRepository enrollments, FileStoragePort storage) {
        this.current = current;
        this.users = users;
        this.students = students;
        this.teachers = teachers;
        this.enrollments = enrollments;
        this.storage = storage;
    }

    public record Avatar(byte[] bytes, String contentType) {}

    @Transactional
    public void upload(MultipartFile file) {
        if (file.isEmpty() || file.getSize() > MAX_BYTES)
            throw new DomainValidationException("Avatar must contain at most 2 MB and cannot be empty");
        try {
            byte[] bytes = file.getBytes();
            String type = contentType(bytes);
            User user = find(current.userId());
            String old = user.getAvatarPath();
            String path = storage.save("avatar" + ("image/png".equals(type) ? ".png" : ".jpg"), bytes);
            StorageTransactions.deleteOnRollback(storage, path);
            user.setAvatarPath(path);
            users.save(user);
            StorageTransactions.deleteAfterCommit(storage, old);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public Avatar mine() {
        return read(find(current.userId()));
    }

    public Avatar forUser(UUID userId) {
        User user = find(userId);
        if (!current.isAdmin() && !current.userId().equals(userId)) assertLinked(userId);
        return read(user);
    }

    @Transactional
    public void delete() {
        User user = find(current.userId());
        String old = user.getAvatarPath();
        user.setAvatarPath(null);
        users.save(user);
        StorageTransactions.deleteAfterCommit(storage, old);
    }

    private void assertLinked(UUID studentUserId) {
        User requester = find(current.userId());
        if (requester.getRoles().stream().noneMatch(role -> "TEACHER".equals(role.getName())))
            throw new OwnershipException("Avatar belongs to another user");
        var teacher = teachers.findByUserId(requester.getId());
        var student = students.findByUserId(studentUserId);
        if (teacher.isEmpty() || student.isEmpty() || enrollments.findByTeacherIdAndStudentId(
                teacher.get().getId(), student.get().getId()).isEmpty())
            throw new OwnershipException("Student is not linked to this teacher");
    }

    private User find(UUID id) {
        return users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User"));
    }

    private Avatar read(User user) {
        if (!user.hasAvatar()) throw new ResourceNotFoundException("Avatar");
        byte[] bytes = storage.read(user.getAvatarPath());
        return new Avatar(bytes, contentType(bytes));
    }

    private String contentType(byte[] bytes) {
        if (FileSignatures.isPng(bytes)) return "image/png";
        if (FileSignatures.isJpeg(bytes)) return "image/jpeg";
        throw new DomainValidationException("Avatar must be a PNG or JPEG image");
    }
}
