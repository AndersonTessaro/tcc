package br.com.harmonia.teacher;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class TeacherStudentManagementIT {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;

    private String admin;
    private TeacherAccount teacher;
    private String instrumentId;

    private record TeacherAccount(String id, String name, String token) {}

    @BeforeEach
    void setUp() throws Exception {
        admin = login("admin", "Admin@123");
        instrumentId = postId(admin, "/admin/instruments", Map.of("name", "Instrument-" + UUID.randomUUID()));
        teacher = createTeacher();
    }

    private String login(String username, String password) throws Exception {
        String body = mvc.perform(post("/auth/login").contentType("application/json")
                .content(json.writeValueAsString(Map.of("login", username, "password", password))))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    private ResultActions postJson(String token, String route, Map<String, Object> body) throws Exception {
        return mvc.perform(post(route).header("Authorization", "Bearer " + token)
            .contentType("application/json").content(json.writeValueAsString(body)));
    }

    private String postId(String token, String route, Map<String, Object> body) throws Exception {
        String response = postJson(token, route, body).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.id");
    }

    private TeacherAccount createTeacher() throws Exception {
        String username = "teacher-" + UUID.randomUUID();
        String name = "Teacher " + username;
        String id = postId(admin, "/admin/teachers", Map.of("username", username, "email", username + "@h.local",
            "password", "Teach@1234", "name", name, "instrumentIds", List.of(instrumentId)));
        return new TeacherAccount(id, name, login(username, "Teach@1234"));
    }

    private Map<String, Object> newStudent() {
        String username = "student-" + UUID.randomUUID();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("username", username);
        body.put("email", username + "@h.local");
        body.put("password", "Student@123");
        body.put("name", "Student Name");
        body.put("phone", "+55 (45) 1234-5678");
        body.put("instrumentId", instrumentId);
        body.put("privateNotes", " Private first ");
        body.put("sharedNotes", " Shared first ");
        return body;
    }

    private ResultActions profile(String token, String studentId) throws Exception {
        return mvc.perform(get("/teacher/students/" + studentId + "/profile")
            .header("Authorization", "Bearer " + token));
    }

    private ResultActions update(String token, String studentId, Map<String, Object> body) throws Exception {
        return mvc.perform(put("/teacher/students/" + studentId + "/profile")
            .header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(body)));
    }

    private ResultActions sharedNotes(String token) throws Exception {
        return mvc.perform(get("/me/teacher-notes").header("Authorization", "Bearer " + token));
    }

    private void enroll(TeacherAccount account, String studentId) throws Exception {
        postId(admin, "/admin/enrollments", Map.of("studentId", studentId, "teacherId", account.id(),
            "instrumentId", instrumentId));
    }

    @Test
    void instruments_areOnlyActiveInstrumentsTaughtByCurrentTeacher() throws Exception {
        postId(admin, "/admin/instruments", Map.of("name", "Other-" + UUID.randomUUID()));
        mvc.perform(get("/teacher/instruments").header("Authorization", "Bearer " + teacher.token()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()", is(1)))
            .andExpect(jsonPath("$[0].id", is(instrumentId)));

        jdbc.update("UPDATE instrument SET active = false WHERE id = ?", UUID.fromString(instrumentId));
        mvc.perform(get("/teacher/instruments").header("Authorization", "Bearer " + teacher.token()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()", is(0)));
    }

    @Test
    void register_createsLinkedStudentWhoCanLoginByUsernameAndEmail() throws Exception {
        Map<String, Object> body = newStudent();
        String response = postJson(teacher.token(), "/teacher/students", body).andExpect(status().isOk())
            .andExpect(jsonPath("$.name", is("Student Name")))
            .andExpect(jsonPath("$.phone", is(body.get("phone"))))
            .andExpect(jsonPath("$.privateNotes", is("Private first")))
            .andExpect(jsonPath("$.sharedNotes", is("Shared first")))
            .andExpect(jsonPath("$.password").doesNotExist())
            .andExpect(jsonPath("$.user").doesNotExist())
            .andReturn().getResponse().getContentAsString();
        String studentId = JsonPath.read(response, "$.id");

        mvc.perform(get("/teacher/students").header("Authorization", "Bearer " + teacher.token()))
            .andExpect(status().isOk()).andExpect(jsonPath("$[*].id", hasItem(studentId)));
        mvc.perform(get("/teacher/enrollments").header("Authorization", "Bearer " + teacher.token()))
            .andExpect(status().isOk()).andExpect(jsonPath("$[*].studentId", hasItem(studentId)));
        String token = login((String) body.get("username"), "Student@123");
        login((String) body.get("email"), "Student@123");
        mvc.perform(get("/auth/me").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.authorities", hasItem("ROLE_STUDENT")))
            .andExpect(jsonPath("$.authorities", hasItem("note.read")))
            .andExpect(jsonPath("$.authorities", not(hasItem("student.register"))));
    }

    @Test
    void register_untaughtInstrumentRollsBackUserStudentEnrollmentAndNotes() throws Exception {
        Map<String, Object> body = newStudent();
        String other = postId(admin, "/admin/instruments", Map.of("name", "Untaught-" + UUID.randomUUID()));
        body.put("instrumentId", other);
        postJson(teacher.token(), "/teacher/students", body)
            .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code", is("DOMAIN_VALIDATION")))
            .andExpect(jsonPath("$.message", is("Teacher does not teach this instrument")));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM auth_user WHERE username = ?", Integer.class,
            body.get("username"))).isZero();
        body.put("instrumentId", instrumentId);
        postId(teacher.token(), "/teacher/students", body);
    }

    @Test
    void register_inactiveAndMissingInstrumentsHaveDomainAndNotFoundErrors() throws Exception {
        Map<String, Object> body = newStudent();
        body.put("instrumentId", UUID.randomUUID().toString());
        postJson(teacher.token(), "/teacher/students", body).andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code", is("NOT_FOUND")));
        jdbc.update("UPDATE instrument SET active = false WHERE id = ?", UUID.fromString(instrumentId));
        body.put("instrumentId", instrumentId);
        postJson(teacher.token(), "/teacher/students", body).andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code", is("DOMAIN_VALIDATION")))
            .andExpect(jsonPath("$.message", is("Instrument is not active")));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM auth_user WHERE username = ?", Integer.class,
            body.get("username"))).isZero();
    }

    @Test
    void register_duplicateUsernameAndEmailReturnIdentifiableConflicts() throws Exception {
        Map<String, Object> existing = newStudent();
        postId(teacher.token(), "/teacher/students", existing);
        Map<String, Object> duplicate = newStudent();
        duplicate.put("username", existing.get("username"));
        postJson(teacher.token(), "/teacher/students", duplicate).andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("DUPLICATE_RESOURCE")))
            .andExpect(jsonPath("$.message", is("Username already in use")));
        duplicate = newStudent();
        duplicate.put("email", existing.get("email"));
        postJson(teacher.token(), "/teacher/students", duplicate).andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("DUPLICATE_RESOURCE")))
            .andExpect(jsonPath("$.message", is("Email already in use")));
    }

    @Test
    void register_invalidEmailPasswordPhoneAndLengthsReturnValidation() throws Exception {
        Map<String, Object> invalid = Map.of("email", "invalid", "password", "short", "phone", "invalid-phone",
            "username", "u".repeat(101), "name", "n".repeat(151), "privateNotes", "p".repeat(1001),
            "sharedNotes", "s".repeat(1001));
        for (var field : invalid.entrySet()) {
            Map<String, Object> body = newStudent();
            body.put(field.getKey(), field.getValue());
            postJson(teacher.token(), "/teacher/students", body).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code", is("VALIDATION")));
        }
        for (String password : List.of("a".repeat(73), "é".repeat(37))) {
            Map<String, Object> body = newStudent();
            body.put("password", password);
            postJson(teacher.token(), "/teacher/students", body).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code", is("VALIDATION")));
        }
    }

    @Test
    void update_replacesNamePhoneAndNotesThenDeletesRowWhenBothNotesBlank() throws Exception {
        String studentId = postId(teacher.token(), "/teacher/students", newStudent());
        Map<String, Object> changes = Map.of("name", " Updated Name ", "phone", " 87654321 ",
            "privateNotes", " Updated private ", "sharedNotes", " Updated shared ");
        update(teacher.token(), studentId, changes).andExpect(status().isOk())
            .andExpect(jsonPath("$.name", is("Updated Name")))
            .andExpect(jsonPath("$.phone", is("87654321")))
            .andExpect(jsonPath("$.privateNotes", is("Updated private")))
            .andExpect(jsonPath("$.sharedNotes", is("Updated shared")));
        profile(teacher.token(), studentId).andExpect(status().isOk())
            .andExpect(jsonPath("$.name", is("Updated Name")))
            .andExpect(jsonPath("$.phone", is("87654321")))
            .andExpect(jsonPath("$.privateNotes", is("Updated private")))
            .andExpect(jsonPath("$.sharedNotes", is("Updated shared")));
        update(teacher.token(), studentId, Map.of("name", "Name", "privateNotes", " ", "sharedNotes", "\n"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.phone", nullValue()))
            .andExpect(jsonPath("$.privateNotes", nullValue())).andExpect(jsonPath("$.sharedNotes", nullValue()));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM teacher_student_note WHERE student_id = ?",
            Integer.class, UUID.fromString(studentId))).isZero();
        profile(teacher.token(), studentId).andExpect(jsonPath("$.privateNotes", nullValue()))
            .andExpect(jsonPath("$.sharedNotes", nullValue()));
    }

    @Test
    void notes_areIsolatedByTeacherAndStudentReadsOnlySharedNotesNewestFirst() throws Exception {
        Map<String, Object> body = newStudent();
        String studentId = postId(teacher.token(), "/teacher/students", body);
        TeacherAccount second = createTeacher();
        enroll(second, studentId);
        profile(second.token(), studentId).andExpect(status().isOk())
            .andExpect(jsonPath("$.privateNotes", nullValue())).andExpect(jsonPath("$.sharedNotes", nullValue()));
        update(second.token(), studentId, Map.of("name", "Student Name", "privateNotes", "Private second",
            "sharedNotes", "Shared second")).andExpect(status().isOk());
        profile(teacher.token(), studentId).andExpect(jsonPath("$.privateNotes", is("Private first")))
            .andExpect(jsonPath("$.sharedNotes", is("Shared first")));
        profile(second.token(), studentId).andExpect(jsonPath("$.privateNotes", is("Private second")))
            .andExpect(jsonPath("$.sharedNotes", is("Shared second")));
        profile(admin, studentId).andExpect(status().isOk()).andExpect(jsonPath("$.privateNotes", nullValue()))
            .andExpect(jsonPath("$.sharedNotes", nullValue()));

        String studentToken = login((String) body.get("username"), "Student@123");
        String response = sharedNotes(studentToken).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()", is(2)))
            .andExpect(jsonPath("$[0].teacherName", is(second.name())))
            .andExpect(jsonPath("$[0].notes", is("Shared second")))
            .andExpect(jsonPath("$[0].updatedAt", notNullValue()))
            .andExpect(jsonPath("$[1].teacherName", is(teacher.name())))
            .andExpect(jsonPath("$[1].notes", is("Shared first")))
            .andReturn().getResponse().getContentAsString();
        assertThat(response).doesNotContain("privateNotes", "private_notes", "Private first", "Private second");
        sharedNotes(teacher.token()).andExpect(status().isForbidden()).andExpect(jsonPath("$.code", is("ACCESS_DENIED")));
        sharedNotes(admin).andExpect(status().isForbidden()).andExpect(jsonPath("$.code", is("PROFILE_REQUIRED")));
        update(second.token(), studentId, Map.of("name", "Student Name", "privateNotes", "Private only"))
            .andExpect(status().isOk());
        sharedNotes(studentToken).andExpect(jsonPath("$.length()", is(1)))
            .andExpect(jsonPath("$[0].notes", is("Shared first")));
        Map<String, Object> outsider = newStudent();
        postId(admin, "/admin/students", outsider);
        sharedNotes(login((String) outsider.get("username"), "Student@123"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()", is(0)));
    }

    @Test
    void unlinkedTeacherCannotReadOrUpdateEvenWhenStudentDoesNotExist() throws Exception {
        String studentId = postId(teacher.token(), "/teacher/students", newStudent());
        TeacherAccount outsider = createTeacher();
        for (String id : List.of(studentId, UUID.randomUUID().toString())) {
            profile(outsider.token(), id).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code", is("OWNERSHIP_DENIED")));
            update(outsider.token(), id, Map.of("name", "Changed")).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code", is("OWNERSHIP_DENIED")));
        }
    }

    @Test
    void inactiveEnrollmentAllowsReadButForbidsUpdate() throws Exception {
        String studentId = postId(teacher.token(), "/teacher/students", newStudent());
        jdbc.update("UPDATE enrollment SET status = 'SUSPENDED' WHERE teacher_id = ? AND student_id = ?",
            UUID.fromString(teacher.id()), UUID.fromString(studentId));
        profile(teacher.token(), studentId).andExpect(status().isOk());
        update(teacher.token(), studentId, Map.of("name", "Changed", "sharedNotes", "Changed"))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code", is("OWNERSHIP_DENIED")));
        profile(teacher.token(), studentId).andExpect(jsonPath("$.name", is("Student Name")))
            .andExpect(jsonPath("$.sharedNotes", is("Shared first")));
    }

    @Test
    void studentHasNoStaffAuthoritiesAndPureAdminNeedsTeacherProfileForWrites() throws Exception {
        Map<String, Object> body = newStudent();
        String studentId = postId(teacher.token(), "/teacher/students", body);
        String token = login((String) body.get("username"), "Student@123");
        postJson(token, "/teacher/students", newStudent()).andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code", is("ACCESS_DENIED")));
        update(token, studentId, Map.of("name", "Changed")).andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code", is("ACCESS_DENIED")));
        profile(token, studentId).andExpect(status().isForbidden()).andExpect(jsonPath("$.code", is("ACCESS_DENIED")));
        mvc.perform(get("/teacher/instruments").header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code", is("ACCESS_DENIED")));
        postJson(admin, "/teacher/students", newStudent()).andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code", is("PROFILE_REQUIRED")));
        update(admin, studentId, Map.of("name", "Changed")).andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code", is("PROFILE_REQUIRED")));
    }
}
