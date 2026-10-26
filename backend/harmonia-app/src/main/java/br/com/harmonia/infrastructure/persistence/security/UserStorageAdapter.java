package br.com.harmonia.infrastructure.persistence.security;

import br.com.harmonia.application.admin.port.UserStorageRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public class UserStorageAdapter implements UserStorageRepository {
    private final JdbcTemplate jdbc;

    public UserStorageAdapter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<String> pathsForUser(UUID userId) {
        return jdbc.queryForList("""
            SELECT avatar_path FROM auth_user WHERE id = ? AND avatar_path IS NOT NULL
            UNION
            SELECT m.storage_path FROM material m
            JOIN student s ON s.id = m.student_id JOIN teacher t ON t.id = m.teacher_id
            WHERE s.user_id = ? OR t.user_id = ?
            UNION
            SELECT a.storage_path FROM lesson_attachment a
            JOIN lesson l ON l.id = a.lesson_id JOIN enrollment e ON e.id = l.enrollment_id
            JOIN student s ON s.id = e.student_id JOIN teacher t ON t.id = e.teacher_id
            WHERE s.user_id = ? OR t.user_id = ?
            UNION
            SELECT p.recording_storage_path FROM practice p JOIN student s ON s.id = p.student_id
            WHERE s.user_id = ? AND p.recording_storage_path IS NOT NULL
            """, String.class, userId, userId, userId, userId, userId, userId);
    }
}
