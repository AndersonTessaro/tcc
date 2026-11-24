package br.com.harmonia.application.account;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.profile.port.StudentRepository;
import br.com.harmonia.application.profile.port.TeacherRepository;
import br.com.harmonia.application.security.port.RefreshTokenRepository;
import br.com.harmonia.application.security.port.UserRepository;
import br.com.harmonia.infrastructure.persistence.security.User;
import br.com.harmonia.lessoncore.DomainValidationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class AccountUseCase {
    private final CurrentUserService current;
    private final UserRepository users;
    private final TeacherRepository teachers;
    private final StudentRepository students;
    private final RefreshTokenRepository tokens;
    private final PasswordEncoder encoder;
    private final TermsCatalog terms;

    public record Instrument(UUID id, String name) {}
    public record TeacherProfile(String bio, List<Instrument> instruments) {}
    public record StudentProfile(String bio) {}
    public record Account(String username, String email, String displayName, List<String> roles,
                          TeacherProfile teacher, StudentProfile student, boolean hasAvatar) {}

    public AccountUseCase(CurrentUserService current, UserRepository users, TeacherRepository teachers,
                          StudentRepository students, RefreshTokenRepository tokens, PasswordEncoder encoder,
                          TermsCatalog terms) {
        this.current = current;
        this.users = users;
        this.teachers = teachers;
        this.students = students;
        this.tokens = tokens;
        this.encoder = encoder;
        this.terms = terms;
    }

    public Account get() {
        return response(user());
    }

    @Transactional
    public Account update(String displayName, String bio) {
        User user = user();
        user.setDisplayName(displayName.trim());
        teachers.findByUserId(user.getId()).ifPresent(teacher -> teacher.setBio(bio));
        students.findByUserId(user.getId()).ifPresent(student -> student.setBio(bio));
        return response(user);
    }

    @Transactional
    public void changePassword(String currentPassword, String newPassword) {
        User user = user();
        if (currentPassword.getBytes(StandardCharsets.UTF_8).length > 72
                || !encoder.matches(currentPassword, user.getPassword()))
            throw new DomainValidationException("Current password is incorrect");
        if (encoder.matches(newPassword, user.getPassword()))
            throw new DomainValidationException("New password must differ from current password");
        user.setPassword(encoder.encode(newPassword));
        LocalDateTime now = LocalDateTime.now();
        tokens.findByUserIdAndRevokedAtIsNull(user.getId()).forEach(token -> token.setRevokedAt(now));
    }

    @Transactional
    public void acceptTerms(String version) {
        if (!terms.isCurrent(version)) throw new DomainValidationException("Terms version is outdated");
        User user = user();
        user.setTermsVersion(version);
        user.setTermsAcceptedAt(LocalDateTime.now());
    }

    private User user() {
        return users.findById(current.userId()).orElseThrow();
    }

    private Account response(User user) {
        var profile = teachers.findByUserId(user.getId()).map(teacher -> new TeacherProfile(
            teacher.getBio(), teacher.getInstruments().stream().map(i -> new Instrument(i.getId(), i.getName()))
                .sorted(Comparator.comparing(Instrument::name)).toList())).orElse(null);
        var student = students.findByUserId(user.getId()).map(s -> new StudentProfile(s.getBio())).orElse(null);
        return new Account(user.getUsername(), user.getEmail(), user.nameForDisplay(),
            user.getRoles().stream().map(role -> role.getName()).sorted().toList(), profile, student, user.hasAvatar());
    }
}
