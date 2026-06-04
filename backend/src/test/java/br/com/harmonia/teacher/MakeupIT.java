package br.com.harmonia.teacher;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class MakeupIT {

    @Autowired MockMvc mvc;

    private String login(String user, String password) throws Exception {
        String body = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"" + user + "\",\"password\":\"" + password + "\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    private String postId(String token, String path, String json) throws Exception {
        String body = mvc.perform(post(path).header("Authorization", "Bearer " + token)
                .contentType("application/json").content(json))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    @Test
    void teacher_createsMakeupLinkedToOriginal() throws Exception {
        String admin = login("admin", "Admin@123");
        String inst = postId(admin, "/admin/instruments", "{\"name\":\"Cello\"}");
        String teacher = postId(admin, "/admin/teachers",
            "{\"username\":\"teacherMk\",\"email\":\"mk@h.local\",\"password\":\"Teach@1234\",\"name\":\"Teacher Mk\"}");
        String student = postId(admin, "/admin/students",
            "{\"username\":\"studentMk\",\"email\":\"stmk@h.local\",\"password\":\"Student@123\",\"name\":\"Student Mk\"}");
        String enrollment = postId(admin, "/admin/enrollments",
            "{\"studentId\":\"" + student + "\",\"teacherId\":\"" + teacher + "\",\"instrumentId\":\"" + inst + "\"}");

        String t = login("teacherMk", "Teach@1234");
        String today = LocalDate.now().toString();

        String originalLesson = postId(t, "/teacher/lessons",
            "{\"enrollmentId\":\"" + enrollment + "\",\"date\":\"" + today + "\",\"startTime\":\"09:00\",\"content\":\"Bow\"}");

        mvc.perform(post("/teacher/lessons/" + originalLesson + "/makeup").header("Authorization", "Bearer " + t)
                .contentType("application/json")
                .content("{\"date\":\"" + today + "\",\"startTime\":\"11:00\",\"reason\":\"Aluno faltou\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id", notNullValue()))
            .andExpect(jsonPath("$.originalLesson.id", notNullValue()))
            .andExpect(jsonPath("$.newLesson.id", notNullValue()));
    }
}
