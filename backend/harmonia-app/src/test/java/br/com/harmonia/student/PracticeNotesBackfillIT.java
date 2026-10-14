package br.com.harmonia.student;

import br.com.harmonia.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class PracticeNotesBackfillIT {

    @Autowired JdbcTemplate jdbc;

    private record Feedback(String notes, String difficulty, Integer rating) {}
    private record BackfillCase(String legacyNotes, Feedback expected) {}

    private UUID student() {
        UUID userId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        String username = "backfill-" + userId;
        jdbc.update("INSERT INTO auth_user(id, username, email, password) VALUES (?, ?, ?, ?)",
            userId, username, username + "@h.local", "unused");
        jdbc.update("INSERT INTO student(id, user_id) VALUES (?, ?)", studentId, userId);
        return studentId;
    }

    private void runBackfill() {
        var populator = new ResourceDatabasePopulator(
            new ClassPathResource("db/migration/V15__practice_notes_backfill.sql"));
        populator.setSqlScriptEncoding(StandardCharsets.UTF_8.name());
        jdbc.execute((ConnectionCallback<Void>) connection -> {
            populator.populate(connection);
            return null;
        });
    }

    private Feedback feedback(UUID id) {
        return jdbc.queryForObject("SELECT notes, difficulty, rating FROM practice WHERE id = ?",
            (rs, rowNum) -> new Feedback(rs.getString("notes"), rs.getString("difficulty"),
                rs.getObject("rating", Integer.class)), id);
    }

    private Map<UUID, String> rowVersions(UUID studentId) {
        Map<UUID, String> versions = new LinkedHashMap<>();
        jdbc.query("SELECT id, ctid::text AS row_version FROM practice WHERE student_id = ?",
            (rs, rowNum) -> versions.put(rs.getObject("id", UUID.class), rs.getString("row_version")), studentId);
        return versions;
    }

    private long changedRows(Map<UUID, String> before, Map<UUID, String> after) {
        // PostgreSQL changes ctid on every UPDATE, even when the values stay the same.
        return after.entrySet().stream()
            .filter(entry -> !entry.getValue().equals(before.get(entry.getKey()))).count();
    }

    @Test
    void backfill_migratesLegacyConventionAndSecondRunUpdatesZeroRows() {
        String oversized = "a; Dificuldade: " + "x".repeat(300);
        var cases = new BackfillCase[] {
            new BackfillCase("Escalas; Dificuldade: Acordes; Avaliação: 5/5", new Feedback("Escalas", "Acordes", 5)),
            new BackfillCase("Escalas; arpejos; Dificuldade: troca; ritmo; Avaliação: 3/5",
                new Feedback("Escalas; arpejos", "troca; ritmo", 3)),
            new BackfillCase("Escalas; Avaliação: 2/5", new Feedback("Escalas", null, 2)),
            new BackfillCase("Avaliação: 4/5", new Feedback(null, null, 4)),
            new BackfillCase("Dificuldade: pestana", new Feedback(null, "pestana", null)),
            new BackfillCase("Escalas\nmúsica nova; Dificuldade: x", new Feedback("Escalas\nmúsica nova", "x", null)),
            new BackfillCase("Arpejos livres", new Feedback("Arpejos livres", null, null)),
            new BackfillCase("Avaliação: 9/5", new Feedback("Avaliação: 9/5", null, null)),
            new BackfillCase(oversized, new Feedback(oversized, null, null))
        };
        UUID studentId = student();
        Map<UUID, Feedback> expected = new LinkedHashMap<>();
        for (BackfillCase testCase : cases) {
            UUID id = UUID.randomUUID();
            jdbc.update("INSERT INTO practice(id, student_id, date, duration_min, notes) VALUES (?, ?, CURRENT_DATE, ?, ?)",
                id, studentId, 30, testCase.legacyNotes());
            expected.put(id, testCase.expected());
        }
        Map<UUID, String> before = rowVersions(studentId);
        runBackfill();
        expected.forEach((id, value) -> assertThat(feedback(id)).as("practice %s", id).isEqualTo(value));
        Map<UUID, String> afterFirstRun = rowVersions(studentId);
        assertThat(changedRows(before, afterFirstRun)).isEqualTo(6);

        runBackfill();
        assertThat(changedRows(afterFirstRun, rowVersions(studentId))).isZero();
        expected.forEach((id, value) -> assertThat(feedback(id)).as("practice %s after second run", id).isEqualTo(value));
    }
}
