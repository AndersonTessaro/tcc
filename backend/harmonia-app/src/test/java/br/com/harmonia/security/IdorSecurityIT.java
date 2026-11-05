package br.com.harmonia.security;

import br.com.harmonia.TestcontainersConfiguration;
import br.com.harmonia.security.SecurityFixture.Pair;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.List;

import static br.com.harmonia.security.SecurityFixture.denied;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("Segurança — IDOR (acesso a objeto de outro usuário trocando o id)")
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class IdorSecurityIT {
    @Autowired MockMvc mvc;

    private Pair a;
    private Pair b;

    @BeforeEach
    void setUp() throws Exception {
        var fx = new SecurityFixture(mvc);
        a = fx.pair();
        b = fx.pair();
    }

    private static MockHttpServletRequestBuilder as(String token, MockHttpServletRequestBuilder request) {
        return request.header("Authorization", "Bearer " + token);
    }

    @Test
    @DisplayName("aluno A não lê a aula do aluno B trocando o id na URL")
    void studentCannotReadAnotherStudentsLesson() throws Exception {
        mvc.perform(as(b.student().token(), get("/me/lessons/" + b.lessonId()))).andExpect(status().isOk());
        mvc.perform(as(a.student().token(), get("/me/lessons/" + b.lessonId()))).andExpect(denied());
    }

    @Test
    @DisplayName("professor A não acessa dados de aluno que não é seu")
    void teacherCannotReadUnlinkedStudent() throws Exception {
        String other = b.student().id();
        for (String path : List.of("/teacher/students/" + other, "/teacher/students/" + other + "/profile",
                "/teacher/students/" + other + "/practices", "/teacher/students/" + other + "/lessons",
                "/teacher/students/" + other + "/materials")) {
            mvc.perform(as(b.teacher().token(), get(path))).andExpect(status().isOk());
            mvc.perform(as(a.teacher().token(), get(path))).andExpect(denied());
        }
    }

    @Test
    @DisplayName("professor A não lê, edita nem cancela aula do professor B")
    void teacherCannotTouchAnotherTeachersLesson() throws Exception {
        String lesson = "/teacher/lessons/" + b.lessonId();
        mvc.perform(as(a.teacher().token(), get(lesson))).andExpect(denied());
        mvc.perform(as(a.teacher().token(), put(lesson).contentType("application/json")
            .content(SecurityFixture.lessonEdit("invadido")))).andExpect(denied());
        mvc.perform(as(a.teacher().token(), patch(lesson + "/status").contentType("application/json")
            .content("{\"status\":\"CANCELED\"}"))).andExpect(denied());

        mvc.perform(as(b.teacher().token(), get(lesson))).andExpect(status().isOk())
            .andExpect(jsonPath("$.lesson.content").value("Escalas"))
            .andExpect(jsonPath("$.lesson.status").value("SCHEDULED"));
    }

    @Test
    @DisplayName("professor A não cria meta para aluno de outro professor")
    void teacherCannotCreateGoalForUnlinkedStudent() throws Exception {
        mvc.perform(as(a.teacher().token(), post("/teacher/students/" + b.student().id() + "/goals")
            .contentType("application/json")
            .content("{\"title\":\"x\",\"type\":\"PRACTICE_DAYS\",\"period\":\"WEEKLY\",\"target\":2}")))
            .andExpect(denied());
    }

    @Test
    @DisplayName("professor A não baixa a gravação da prática do aluno de B")
    void teacherCannotDownloadAnotherStudentsPracticeRecording() throws Exception {
        String practice = postPractice(b.student().token());
        mvc.perform(as(a.teacher().token(), get("/teacher/practices/" + practice + "/recording"))).andExpect(denied());
    }

    @Test
    @DisplayName("usuário não marca como lida a notificação de outro usuário")
    void userCannotReadAnotherUsersNotification() throws Exception {
        postPractice(b.student().token());
        String list = mvc.perform(as(b.teacher().token(), get("/notifications")))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String notification = JsonPath.<List<String>>read(list, "$.items[*].id").getFirst();

        mvc.perform(as(a.teacher().token(), patch("/notifications/" + notification + "/read")))
            .andExpect(status().isNotFound());
        mvc.perform(as(b.teacher().token(), patch("/notifications/" + notification + "/read")))
            .andExpect(status().is2xxSuccessful());
    }

    @Test
    @DisplayName("aluno e professor não sobem de privilégio para rotas de outro perfil")
    void noPrivilegeEscalation() throws Exception {
        mvc.perform(as(a.student().token(), get("/teacher/students"))).andExpect(status().isForbidden());
        mvc.perform(as(a.student().token(), get("/admin/security/users"))).andExpect(status().isForbidden());
        mvc.perform(as(a.teacher().token(), get("/admin/security/users"))).andExpect(status().isForbidden());
    }

    private String postPractice(String studentToken) throws Exception {
        String body = mvc.perform(as(studentToken, post("/me/practices")).contentType("application/json")
                .content("{\"durationMin\":30}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.practiceId");
    }
}
