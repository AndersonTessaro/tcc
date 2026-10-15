package br.com.harmonia.teacher;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
public abstract class MoreMenuITSupport {
    @Autowired protected MockMvc mvc;
    @Autowired protected JdbcTemplate jdbc;
    protected String admin;
    protected String suffix;
    protected final LocalDate today = LocalDate.now();

    @BeforeEach
    protected void authenticateAdmin() throws Exception {
        suffix = UUID.randomUUID().toString().substring(0, 8);
        admin = login("admin", "Admin@123");
    }

    protected String loginBody(String username, String password) throws Exception {
        return mvc.perform(post("/auth/login").contentType("application/json").content("""
            {"login":"%s","password":"%s"}
            """.formatted(username, password))).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
    }

    protected String login(String username, String password) throws Exception {
        return JsonPath.read(loginBody(username, password), "$.accessToken");
    }

    protected String postId(String token, String path, String json) throws Exception {
        String body = mvc.perform(post(path).header("Authorization", "Bearer " + token)
            .contentType("application/json").content(json)).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    protected String instrument() throws Exception {
        return postId(admin, "/admin/instruments", """
            {"name":"Piano-%s"}
            """.formatted(suffix));
    }

    protected String teacher(String name, String instrument) throws Exception {
        return postId(admin, "/admin/teachers", """
            {"username":"%s%s","email":"%s%s@h.local","password":"Teach@1234",
             "name":"%s","instrumentIds":["%s"]}
            """.formatted(name, suffix, name, suffix, name, instrument));
    }

    protected String student(String name) throws Exception {
        return postId(admin, "/admin/students", """
            {"username":"%s%s","email":"%s%s@h.local","password":"Student@123","name":"%s"}
            """.formatted(name, suffix, name, suffix, name));
    }

    protected String enroll(String student, String teacher, String instrument, String fee) throws Exception {
        return postId(admin, "/admin/enrollments", """
            {"studentId":"%s","teacherId":"%s","instrumentId":"%s","monthlyFee":%s}
            """.formatted(student, teacher, instrument, fee));
    }

    protected String lesson(String token, String enrollment, LocalDate date, String start, String end) throws Exception {
        return postId(token, "/teacher/lessons", """
            {"enrollmentId":"%s","date":"%s","startTime":"%s","endTime":"%s"}
            """.formatted(enrollment, date, start, end));
    }
}
