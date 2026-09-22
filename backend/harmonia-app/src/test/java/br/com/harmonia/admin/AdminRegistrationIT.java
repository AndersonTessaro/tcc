package br.com.harmonia.admin;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AdminRegistrationIT {

    @Autowired MockMvc mvc;

    private String token() throws Exception {
        return login("admin", "Admin@123");
    }

    private String login(String user, String password) throws Exception {
        String body = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"" + user + "\",\"password\":\"" + password + "\"}"))
            .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    private String postId(String token, String path, String json) throws Exception {
        String body = mvc.perform(post(path).header("Authorization", "Bearer " + token)
                .contentType("application/json").content(json))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id", notNullValue()))
            .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    @Test
    void admin_seedsFullChain() throws Exception {
        String t = token();
        String inst = postId(t, "/admin/instruments", "{\"name\":\"Acoustic Guitar\"}");
        String teacher = postId(t, "/admin/teachers",
            "{\"username\":\"teacher1\",\"email\":\"teacher1@h.local\",\"password\":\"Teach@1234\",\"name\":\"Teacher One\"}");
        String student = postId(t, "/admin/students",
            "{\"username\":\"student1\",\"email\":\"student1@h.local\",\"password\":\"Student@123\",\"name\":\"Student One\"}");
        String enrollment = postId(t, "/admin/enrollments",
            "{\"studentId\":\"" + student + "\",\"teacherId\":\"" + teacher + "\",\"instrumentId\":\"" + inst + "\"}");

        mvc.perform(get("/admin/students").header("Authorization", "Bearer " + t))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == '" + student + "')].name", hasItem("Student One")));
        mvc.perform(get("/admin/teachers").header("Authorization", "Bearer " + t))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == '" + teacher + "')].username", hasItem("teacher1")));
        mvc.perform(get("/admin/instruments").header("Authorization", "Bearer " + t))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == '" + inst + "')].name", hasItem("Acoustic Guitar")));

        String teacherToken = login("teacher1", "Teach@1234");
        mvc.perform(get("/teacher/enrollments").header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id", is(enrollment)))
            .andExpect(jsonPath("$[0].studentId", is(student)))
            .andExpect(jsonPath("$[0].studentName", is("Student One")))
            .andExpect(jsonPath("$[0].instrument", is("Acoustic Guitar")));
    }

    @Test
    void admin_cannotDuplicateActiveEnrollment() throws Exception {
        String t = token();
        String inst = postId(t, "/admin/instruments", "{\"name\":\"Double Bass\"}");
        String teacher = postId(t, "/admin/teachers",
            "{\"username\":\"teacherDup\",\"email\":\"teacherDup@h.local\",\"password\":\"Teach@1234\",\"name\":\"Teacher Dup\"}");
        String student = postId(t, "/admin/students",
            "{\"username\":\"studentDup\",\"email\":\"studentDup@h.local\",\"password\":\"Student@123\",\"name\":\"Student Dup\"}");
        String body = "{\"studentId\":\"" + student + "\",\"teacherId\":\"" + teacher + "\",\"instrumentId\":\"" + inst + "\"}";
        postId(t, "/admin/enrollments", body);

        mvc.perform(post("/admin/enrollments").header("Authorization", "Bearer " + t)
                .contentType("application/json").content(body))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("DUPLICATE_RESOURCE")));
    }

    @Test
    void admin_enrollmentWithUnknownStudent_is404() throws Exception {
        String t = token();
        mvc.perform(post("/admin/enrollments").header("Authorization", "Bearer " + t)
                .contentType("application/json")
                .content("{\"studentId\":\"" + UUID.randomUUID() + "\",\"teacherId\":\""
                    + UUID.randomUUID() + "\",\"instrumentId\":\"" + UUID.randomUUID() + "\"}"))
            .andExpect(status().isNotFound());
    }

    @Test
    void student_cannotListAdminRegistrations() throws Exception {
        String t = token();
        postId(t, "/admin/students",
            "{\"username\":\"student2\",\"email\":\"student2@h.local\",\"password\":\"Student@123\",\"name\":\"Student Two\"}");
        mvc.perform(get("/admin/students").header("Authorization", "Bearer " + login("student2", "Student@123")))
            .andExpect(status().isForbidden());
    }

    @Test
    void admin_endpoint_withoutToken_is401() throws Exception {
        mvc.perform(get("/admin/students")).andExpect(status().isUnauthorized());
    }
}
