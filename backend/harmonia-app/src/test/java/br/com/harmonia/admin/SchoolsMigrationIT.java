package br.com.harmonia.admin;

import br.com.harmonia.TestcontainersConfiguration;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class SchoolsMigrationIT {
    @Autowired JdbcTemplate jdbc;

    @Test
    void migrationBackfillsNonAdminsAndFinanceAndGrantsOnlyExistingPermissions() {
        String schema = "schools_" + UUID.randomUUID().toString().replace("-", "");
        var config = Flyway.configure().dataSource(jdbc.getDataSource()).schemas(schema).defaultSchema(schema);
        try {
            config.target("24").load().migrate();
            jdbc.update("INSERT INTO " + schema + ".auth_user(username, email, password) VALUES ('legacy', 'legacy@test.local', 'unused')");
            jdbc.update("INSERT INTO " + schema + ".auth_user(username, email, password) VALUES ('dual', 'dual@test.local', 'unused')");
            jdbc.update("INSERT INTO " + schema + ".auth_user_roles SELECT u.id, r.id FROM " + schema
                + ".auth_user u CROSS JOIN " + schema + ".auth_role r WHERE u.username = 'dual' AND r.name IN ('ADMIN', 'TEACHER')");
            jdbc.update("INSERT INTO " + schema + ".financial_transaction(type, amount, date) VALUES ('INCOME', 10, CURRENT_DATE)");
            config.target("25").load().migrate();
            UUID school = jdbc.queryForObject("SELECT id FROM " + schema + ".school WHERE name = 'Escola Harmonia'", UUID.class);
            assertThat(jdbc.queryForObject("SELECT school_id FROM " + schema + ".auth_user WHERE username = 'legacy'", UUID.class))
                .isEqualTo(school);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM " + schema
                + ".auth_user WHERE username IN ('admin', 'dual') AND school_id IS NULL", Integer.class)).isEqualTo(2);
            assertThat(jdbc.queryForObject("SELECT school_id FROM " + schema + ".financial_transaction", UUID.class)).isEqualTo(school);
            assertThat(jdbc.queryForList("SELECT r.name FROM " + schema + ".auth_role r JOIN " + schema
                + ".auth_role_permissions rp ON rp.role_id = r.id JOIN " + schema
                + ".auth_permission p ON p.id = rp.permission_id WHERE p.name = 'school.manage'", String.class)).containsExactly("ADMIN");
            assertThat(jdbc.queryForObject("SELECT count(*) FROM " + schema + ".auth_role_permissions rp JOIN " + schema
                + ".auth_role r ON r.id = rp.role_id WHERE r.name = 'MANAGER'", Integer.class)).isEqualTo(13);
            jdbc.update("DELETE FROM " + schema + ".school WHERE id = ?", school);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM " + schema + ".auth_user WHERE username = 'legacy'", Integer.class)).isZero();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM " + schema + ".financial_transaction", Integer.class)).isZero();
        } finally {
            jdbc.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
        }
    }
}
