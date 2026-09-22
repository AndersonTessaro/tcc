package br.com.harmonia.system;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class RegistrationST {
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper json = new ObjectMapper();
    private String admin;

    @BeforeEach
    void login() throws Exception {
        admin = loginAs("admin", "Admin@123");
    }

    private String loginAs(String username, String password) throws Exception {
        var response = post("/auth/login", Map.of("login", username, "password", password), null);
        assertThat(response.statusCode()).as(response.body()).isEqualTo(200);
        return JsonPath.read(response.body(), "$.accessToken");
    }

    private HttpResponse<String> post(String path, Object body, String token) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .timeout(Duration.ofSeconds(30)).header("Content-Type", "application/json");
        if (token != null) request.header("Authorization", "Bearer " + token);
        return http.send(request.POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(),
            HttpResponse.BodyHandlers.ofString());
    }

    private Map<String, Object> user() {
        String name = "reg-" + UUID.randomUUID();
        return new LinkedHashMap<>(Map.of("username", name, "email", name + "@test.local",
            "password", "Register@123", "name", "Registration Test"));
    }

    private String create(String path, Object body) throws Exception {
        var response = post(path, body, admin);
        assertThat(response.statusCode()).as(response.body()).isEqualTo(200);
        Object id = JsonPath.read(response.body(), "$.id");
        assertThat(id).isNotNull();
        return id.toString();
    }

    @ParameterizedTest
    @ValueSource(strings = {"students", "teachers"})
    void createsUserWithCorrectRoleAndEncodedPassword(String kind) throws Exception {
        var body = user();
        String id = create("/admin/" + kind, body);
        assertThat(UUID.fromString(id)).isNotNull();
        String token = loginAs((String) body.get("username"), "Register@123");
        assertThat(token).isNotBlank();
        String password = jdbc.queryForObject("select password from auth_user where username = ?", String.class, body.get("username"));
        assertThat(password).startsWith("$2").isNotEqualTo("Register@123");
        String role = jdbc.queryForObject("select r.name from auth_role r join auth_user_roles ur on ur.role_id=r.id join auth_user u on u.id=ur.user_id where u.username=?", String.class, body.get("username"));
        assertThat(role).isEqualTo(kind.equals("students") ? "STUDENT" : "TEACHER");
    }

    @ParameterizedTest
    @ValueSource(strings = {"students", "teachers"})
    void rejectsInvalidUserFieldsWithoutPersisting(String kind) throws Exception {
        Long initialCount = jdbc.queryForObject("select count(*) from auth_user", Long.class);
        for (String field : new String[]{"username", "email", "password", "name"}) {
            for (Object invalid : new Object[]{null, "", "   "}) {
                var body = user();
                body.put(field, invalid);
                var response = post("/admin/" + kind, body, admin);
                assertThat(response.statusCode()).as(kind + " " + field + "=" + invalid + ": " + response.body()).isEqualTo(422);
            }
        }
        for (var invalid : Map.of("username", "u".repeat(101), "email", "bad-email",
                "password", "short", "name", "n".repeat(151)).entrySet()) {
            var body = user();
            body.put(invalid.getKey(), invalid.getValue());
            assertThat(post("/admin/" + kind, body, admin).statusCode()).as(invalid.getKey()).isEqualTo(422);
        }
        for (String password : new String[]{"p".repeat(73), "é".repeat(37)}) {
            var body = user();
            body.put("password", password);
            assertThat(post("/admin/" + kind, body, admin).statusCode()).isEqualTo(422);
        }
        var longEmail = user();
        longEmail.put("email", "a".repeat(64) + "@" + "b".repeat(63) + "." + "c".repeat(63) + "." + "d".repeat(63));
        assertThat(post("/admin/" + kind, longEmail, admin).statusCode()).isEqualTo(422);
        assertThat(jdbc.queryForObject("select count(*) from auth_user", Long.class)).isEqualTo(initialCount);
    }

    @ParameterizedTest
    @ValueSource(strings = {"students", "teachers"})
    void acceptsUserFieldLimits(String kind) throws Exception {
        var body = user();
        body.put("username", body.get("username") + "u".repeat(60));
        body.put("name", "n".repeat(150));
        body.put("password", "é".repeat(36));
        create("/admin/" + kind, body);
        assertThat(loginAs((String) body.get("username"), (String) body.get("password"))).isNotBlank();
    }

    @ParameterizedTest
    @ValueSource(strings = {"students", "teachers"})
    void duplicateUsernameAndEmailReturnConflictAndRollback(String kind) throws Exception {
        var original = user();
        create("/admin/" + kind, original);
        for (String field : new String[]{"username", "email"}) {
            var duplicate = user();
            duplicate.put(field, original.get(field));
            var response = post("/admin/" + kind, duplicate, admin);
            assertThat(response.statusCode()).as(response.body()).isEqualTo(409);
            String other = field.equals("username") ? "email" : "username";
            assertThat(jdbc.queryForObject("select count(*) from auth_user where " + other + " = ?", Integer.class, duplicate.get(other))).isZero();
        }
    }

    @Test
    void instrumentValidationAndUniqueness() throws Exception {
        String name = "Instrument-" + UUID.randomUUID();
        create("/admin/instruments", Map.of("name", name));
        assertThat(post("/admin/instruments", Map.of("name", name), admin).statusCode()).isEqualTo(409);
        for (Object body : new Object[]{Map.of(), Map.of("name", " "), Map.of("name", "i".repeat(81))}) {
            assertThat(post("/admin/instruments", body, admin).statusCode()).isEqualTo(422);
        }
    }

    @Test
    void enrollmentPersistsLinksAndRejectsMissingReferences() throws Exception {
        var body = new LinkedHashMap<String, Object>();
        String instrumentId = create("/admin/instruments", Map.of("name", "I-" + UUID.randomUUID()));
        var teacher = user();
        teacher.put("instrumentIds", List.of(instrumentId));
        body.put("studentId", create("/admin/students", user()));
        body.put("teacherId", create("/admin/teachers", teacher));
        body.put("instrumentId", instrumentId);
        String id = create("/admin/enrollments", body);
        var row = jdbc.queryForMap("select student_id, teacher_id, instrument_id from enrollment where id=?", UUID.fromString(id));
        assertThat(row.get("student_id").toString()).isEqualTo(body.get("studentId"));
        assertThat(row.get("teacher_id").toString()).isEqualTo(body.get("teacherId"));
        assertThat(row.get("instrument_id").toString()).isEqualTo(body.get("instrumentId"));
        for (String field : body.keySet()) {
            var invalid = new LinkedHashMap<>(body);
            invalid.put(field, UUID.randomUUID().toString());
            assertThat(post("/admin/enrollments", invalid, admin).statusCode()).as(field).isEqualTo(404);
            invalid.put(field, null);
            assertThat(post("/admin/enrollments", invalid, admin).statusCode()).isEqualTo(422);
            invalid.put(field, "invalid-uuid");
            assertThat(post("/admin/enrollments", invalid, admin).statusCode()).isEqualTo(400);
        }
    }

    @Test
    void roleValidationAndUniqueness() throws Exception {
        var role = Map.of("name", "R-" + UUID.randomUUID(), "description", "Test role");
        create("/admin/security/roles", role);
        assertThat(post("/admin/security/roles", role, admin).statusCode()).isEqualTo(409);
        for (var body : new Object[]{Map.of(), Map.of("name", "r".repeat(51), "description", "Test"),
                Map.of("name", "Test", "description", "d".repeat(256))}) {
            assertThat(post("/admin/security/roles", body, admin).statusCode()).isEqualTo(422);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"students", "teachers", "instruments", "enrollments", "security/roles"})
    void registrationRequiresAuthenticationAndPermission(String path) throws Exception {
        assertThat(post("/admin/" + path, Map.of(), null).statusCode()).isEqualTo(401);
        for (String kind : new String[]{"students", "teachers"}) {
            var account = user();
            create("/admin/" + kind, account);
            String token = loginAs((String) account.get("username"), "Register@123");
            Object body = switch (path) {
                case "students", "teachers" -> user();
                case "enrollments" -> Map.of("studentId", UUID.randomUUID(), "teacherId", UUID.randomUUID(), "instrumentId", UUID.randomUUID());
                default -> Map.of("name", "Test", "description", "Test");
            };
            assertThat(post("/admin/" + path, body, token).statusCode()).as(kind + " -> " + path).isEqualTo(403);
        }
    }
}
