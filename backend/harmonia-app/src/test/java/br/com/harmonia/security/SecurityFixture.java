package br.com.harmonia.security;

import com.jayway.jsonpath.JsonPath;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultMatcher;

import java.time.LocalDate;
import java.util.UUID;

import static br.com.harmonia.SchoolTestSupport.school;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

final class SecurityFixture {
    static final String PASSWORD = "Secret@123";
    static final LocalDate LESSON_DATE = LocalDate.now().plusDays(7);

    private final MockMvc mvc;
    final String admin;
    final String instrumentId;

    record Account(String id, String username, String token) {}

    record Pair(Account teacher, Account student, String enrollmentId, String lessonId) {}

    SecurityFixture(MockMvc mvc) throws Exception {
        this.mvc = mvc;
        this.admin = login("admin", "Admin@123");
        this.instrumentId = postId(admin, "/admin/instruments", "{\"name\":\"Sec-" + UUID.randomUUID() + "\"}");
    }

    static ResultMatcher denied() {
        return result -> assertThat(result.getResponse().getStatus())
            .as("acesso a dado de outro usuário precisa ser recusado").isIn(403, 404);
    }

    String login(String login, String password) throws Exception {
        String body = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"" + login + "\",\"password\":\"" + password + "\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    String postId(String token, String path, String json) throws Exception {
        String body = mvc.perform(post(path).with(school(mvc)).header("Authorization", "Bearer " + token)
                .contentType("application/json").content(json))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    Account teacher() throws Exception {
        String username = "sec-teacher-" + UUID.randomUUID();
        String id = postId(admin, "/admin/teachers", """
            {"username":"%s","email":"%s@h.local","password":"%s","name":"Teacher","instrumentIds":["%s"]}
            """.formatted(username, username, PASSWORD, instrumentId));
        return new Account(id, username, login(username, PASSWORD));
    }

    Account student() throws Exception {
        String username = "sec-student-" + UUID.randomUUID();
        String id = postId(admin, "/admin/students", """
            {"username":"%s","email":"%s@h.local","password":"%s","name":"Student"}
            """.formatted(username, username, PASSWORD));
        return new Account(id, username, login(username, PASSWORD));
    }

    static String lessonEdit(String text) {
        return """
            {"date":"%s","startTime":"10:00","endTime":"11:00","content":%s,"homework":%s}
            """.formatted(LESSON_DATE, quoted(text), quoted(text));
    }

    private static String quoted(String text) {
        return "\"" + text.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    Pair pair() throws Exception {
        Account teacher = teacher();
        Account student = student();
        String enrollment = postId(admin, "/admin/enrollments", """
            {"studentId":"%s","teacherId":"%s","instrumentId":"%s"}
            """.formatted(student.id(), teacher.id(), instrumentId));
        String lesson = postId(teacher.token(), "/teacher/lessons", """
            {"enrollmentId":"%s","date":"%s","startTime":"10:00","endTime":"11:00","content":"Escalas"}
            """.formatted(enrollment, LESSON_DATE));
        return new Pair(teacher, student, enrollment, lesson);
    }
}
