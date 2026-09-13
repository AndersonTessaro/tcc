package br.com.harmonia.application.lesson;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.stream.Stream;

@Component
public class LessonSlotLock {
    private final JdbcTemplate jdbc;

    public LessonSlotLock(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void acquire(UUID teacherId, UUID studentId) {
        Stream.of(teacherId, studentId).distinct().sorted().forEach(this::acquireOne);
    }

    private void acquireOne(UUID id) {
        jdbc.queryForObject("select pg_advisory_xact_lock(hashtextextended(?, 0))", Long.class, id.toString());
    }
}
