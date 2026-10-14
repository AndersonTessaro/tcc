package br.com.harmonia.student;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class PracticeFeedbackIT {

    @Autowired MockMvc mvc;

    private String studentId;
    private String studentToken;
    private String teacherToken;

    private String login(String username, String password) throws Exception {
        String body = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"" + username + "\",\"password\":\"" + password + "\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    private String postId(String token, String path, String json) throws Exception {
        String body = mvc.perform(post(path).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    @BeforeEach
    void setUp() throws Exception {
        String suffix = UUID.randomUUID().toString();
        String admin = login("admin", "Admin@123");
        String instrumentId = postId(admin, "/admin/instruments", "{\"name\":\"Feedback-" + suffix + "\"}");
        String teacherName = "teacherFeedback-" + suffix;
        String studentName = "studentFeedback-" + suffix;
        String teacherId = postId(admin, "/admin/teachers", """
            {"username":"%s","email":"%s@h.local","password":"Practice@123",
             "name":"Teacher Feedback","instrumentIds":["%s"]}
            """.formatted(teacherName, teacherName, instrumentId));
        studentId = postId(admin, "/admin/students", """
            {"username":"%s","email":"%s@h.local","password":"Practice@123","name":"Student Feedback"}
            """.formatted(studentName, studentName));
        postId(admin, "/admin/enrollments", """
            {"studentId":"%s","teacherId":"%s","instrumentId":"%s"}
            """.formatted(studentId, teacherId, instrumentId));
        studentToken = login(studentName, "Practice@123");
        teacherToken = login(teacherName, "Practice@123");
    }

    private String register(String json) throws Exception {
        return mvc.perform(post("/me/practices").header("Authorization", "Bearer " + studentToken)
                .contentType(MediaType.APPLICATION_JSON).content(json))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.practiceId").isString())
            .andExpect(jsonPath("$.length()").value(5))
            .andExpect(jsonPath("$.student").doesNotHaveJsonPath())
            .andReturn().getResponse().getContentAsString();
    }

    private void assertPractice(String id, String notes, String difficulty, Integer rating) throws Exception {
        for (String path : new String[] {"/me/practices", "/teacher/students/" + studentId + "/practices"}) {
            String token = path.startsWith("/me/") ? studentToken : teacherToken;
            mvc.perform(get(path).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(id))
                .andExpect(jsonPath("$[0].notes").value(notes))
                .andExpect(jsonPath("$[0].difficulty").value(difficulty))
                .andExpect(jsonPath("$[0].rating").value(rating))
                .andExpect(jsonPath("$[0].recording").value((Object) null))
                .andExpect(jsonPath("$[0].length()").value(7))
                .andExpect(jsonPath("$[0].student").doesNotHaveJsonPath());
        }
    }

    @Test
    void feedback_isReturnedToStudentAndLinkedTeacher() throws Exception {
        String body = register("""
            {"durationMin":30,"notes":"Scales","difficulty":"Chord changes","rating":4}
            """);
        assertPractice(JsonPath.read(body, "$.practiceId"), "Scales", "Chord changes", 4);
    }

    @Test
    void feedback_doesNotChangeXpForTheSameDuration() throws Exception {
        String withoutFeedback = register("{\"durationMin\":30}");
        String withFeedback = register("""
            {"durationMin":30,"difficulty":"Chord changes","rating":5}
            """);
        int firstXp = JsonPath.read(withoutFeedback, "$.xpTotal");
        int secondXp = JsonPath.read(withFeedback, "$.xpTotal");
        assertThat(firstXp).isEqualTo(30);
        assertThat(secondXp - firstXp).isEqualTo(firstXp);
    }

    @Test
    void invalidFeedback_returnsValidationWithoutSavingPractice() throws Exception {
        for (String json : new String[] {
            "{\"durationMin\":30,\"rating\":0}",
            "{\"durationMin\":30,\"rating\":6}",
            "{\"durationMin\":30,\"difficulty\":\"" + "x".repeat(256) + "\"}",
            "{\"durationMin\":30,\"notes\":\"" + "x".repeat(501) + "\"}"
        }) {
            mvc.perform(post("/me/practices").header("Authorization", "Bearer " + studentToken)
                    .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION"));
        }
        mvc.perform(get("/me/practices").header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/me/dashboard").header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.xp").value(0));
    }

    @Test
    void legacyNotes_areStoredUnchangedWithNullFeedback() throws Exception {
        String notes = "Escalas; Dificuldade: Acordes; Avaliação: 5/5";
        String body = register("{\"durationMin\":30,\"notes\":\"" + notes + "\"}");
        assertPractice(JsonPath.read(body, "$.practiceId"), notes, null, null);
    }

    @Test
    void feedback_acceptsMaximumLengthsAndRatingBoundaries() throws Exception {
        String notes = "n".repeat(500);
        String difficulty = "d".repeat(255);
        String body = register("""
            {"durationMin":30,"notes":"%s","difficulty":"%s","rating":1}
            """.formatted(notes, difficulty));
        assertPractice(JsonPath.read(body, "$.practiceId"), notes, difficulty, 1);
        register("{\"durationMin\":30,\"rating\":5}");
    }
}
