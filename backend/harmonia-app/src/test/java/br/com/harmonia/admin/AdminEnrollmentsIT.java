package br.com.harmonia.admin;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class AdminEnrollmentsIT {
    @Autowired MockMvc mvc;
    private String token;
    private String student;
    private String teacher;
    private String instrument;
    private String enrollment;
    private String teacherUsername;

    @BeforeEach
    void setUp() throws Exception {
        token = login("admin", "Admin@123");
        instrument = postId("/admin/instruments", "{\"name\":\"Piano\"}");
        teacherUsername = "teacher-" + UUID.randomUUID();
        teacher = postId("/admin/teachers", user(teacherUsername, "Carlos")
            .replace("}", ",\"instrumentIds\":[\"" + instrument + "\"]}"));
        student = postId("/admin/students", user("student-" + UUID.randomUUID(), "Ana"));
        enrollment = createEnrollment();
    }

    @Test
    void listsWithAndWithoutStatusAndSortsByStudentName() throws Exception {
        mvc.perform(get("/admin/enrollments").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == '" + enrollment + "')].student.name", hasItem("Ana")))
            .andExpect(jsonPath("$[?(@.id == '" + enrollment + "')].teacher.username", hasItem(teacherUsername)))
            .andExpect(jsonPath("$[?(@.id == '" + enrollment + "')].instrument.name", hasItem("Piano")))
            .andExpect(jsonPath("$[?(@.id == '" + enrollment + "')].classLabel", hasItem("Piano")))
            .andExpect(jsonPath("$[?(@.id == '" + enrollment + "')].monthlyFee", hasItem(150.5)));
        String body = mvc.perform(get("/admin/enrollments").param("status", "ACTIVE")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        List<String> names = JsonPath.read(body, "$[*].student.name");
        assertThat(names).isSorted();
        List<String> statuses = JsonPath.read(body, "$[*].status");
        assertThat(statuses).containsOnly("ACTIVE");
        changeStatus(enrollment, "SUSPENDED", 204);
        mvc.perform(get("/admin/enrollments").param("status", "SUSPENDED")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == '" + enrollment + "')].status", hasItem("SUSPENDED")));
        mvc.perform(get("/admin/enrollments").param("status", "ACTIVE")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[*].id", not(hasItem(enrollment))));
    }

    @Test
    void changesStatusAndAllowsIdempotentActiveUpdate() throws Exception {
        for (String status : List.of("ACTIVE", "SUSPENDED", "CLOSED", "ACTIVE")) {
            changeStatus(enrollment, status, 204);
            mvc.perform(get("/admin/enrollments").param("status", status)
                    .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == '" + enrollment + "')].status", hasItem(status)));
        }
    }

    @Test
    void missingEnrollmentReturns404() throws Exception {
        changeStatus(UUID.randomUUID().toString(), "CLOSED", 404);
    }

    @Test
    void duplicateReactivationReturns409AndPreservesStatus() throws Exception {
        changeStatus(enrollment, "SUSPENDED", 204);
        createEnrollment();
        mvc.perform(put("/admin/enrollments/{id}/status", enrollment)
                .header("Authorization", "Bearer " + token).contentType("application/json")
                .content("{\"status\":\"ACTIVE\"}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code", is("DUPLICATE_RESOURCE")));
        mvc.perform(get("/admin/enrollments").param("status", "SUSPENDED")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$[*].id", hasItem(enrollment)));
    }

    @Test
    void teacherWithoutPermissionIsForbidden() throws Exception {
        String teacherToken = login(teacherUsername, "Password@123");
        mvc.perform(get("/admin/enrollments").header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isForbidden());
        mvc.perform(put("/admin/enrollments/{id}/status", enrollment)
                .header("Authorization", "Bearer " + teacherToken).contentType("application/json")
                .content("{\"status\":\"CLOSED\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedRequestsAreUnauthorized() throws Exception {
        mvc.perform(get("/admin/enrollments")).andExpect(status().isUnauthorized());
        mvc.perform(put("/admin/enrollments/{id}/status", enrollment).contentType("application/json")
                .content("{\"status\":\"CLOSED\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void statusIsRequired() throws Exception {
        mvc.perform(put("/admin/enrollments/{id}/status", enrollment)
                .header("Authorization", "Bearer " + token).contentType("application/json").content("{}"))
            .andExpect(status().isUnprocessableContent());
    }

    private void changeStatus(String id, String next, int expected) throws Exception {
        mvc.perform(put("/admin/enrollments/{id}/status", id)
                .header("Authorization", "Bearer " + token).contentType("application/json")
                .content("{\"status\":\"" + next + "\"}"))
            .andExpect(status().is(expected));
    }

    private String createEnrollment() throws Exception {
        return postId("/admin/enrollments", "{\"studentId\":\"" + student + "\",\"teacherId\":\"" + teacher
            + "\",\"instrumentId\":\"" + instrument + "\",\"monthlyFee\":150.50}");
    }

    private String user(String username, String name) {
        return "{\"username\":\"" + username + "\",\"email\":\"" + username
            + "@h.local\",\"password\":\"Password@123\",\"name\":\"" + name + "\"}";
    }

    private String login(String username, String password) throws Exception {
        String body = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"" + username + "\",\"password\":\"" + password + "\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    private String postId(String path, String json) throws Exception {
        String body = mvc.perform(post(path).header("Authorization", "Bearer " + token)
                .contentType("application/json").content(json))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }
}
