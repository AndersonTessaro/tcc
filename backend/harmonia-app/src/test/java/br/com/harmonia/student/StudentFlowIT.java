package br.com.harmonia.student;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import java.time.LocalDate;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class StudentFlowIT {

    @Autowired MockMvc mvc;

    private String login(String user, String password) throws Exception {
        String body = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"" + user + "\",\"password\":\"" + password + "\"}"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    private String postId(String token, String path, String json) throws Exception {
        String body = mvc.perform(post(path).header("Authorization", "Bearer " + token)
                .contentType("application/json").content(json))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    @Test
    void student_practice_goal_dashboard() throws Exception {
        String admin = login("admin", "Admin@123");
        String inst = postId(admin, "/admin/instruments", "{\"name\":\"Piano\"}");
        String teacher = postId(admin, "/admin/teachers",
            "{\"username\":\"teacherA\",\"email\":\"teacherA@h.local\",\"password\":\"Teach@1234\",\"name\":\"Teacher A\",\"instrumentIds\":[\"" + inst + "\"]}");
        String student = postId(admin, "/admin/students",
            "{\"username\":\"studentA\",\"email\":\"studentA@h.local\",\"password\":\"Student@123\",\"name\":\"Student A\"}");
        String enrollment = postId(admin, "/admin/enrollments",
            "{\"studentId\":\"" + student + "\",\"teacherId\":\"" + teacher + "\",\"instrumentId\":\"" + inst + "\"}");

        String t = login("studentA", "Student@123");

        // 1st practice 60 min -> xp 60, level 1
        mvc.perform(post("/me/practices").header("Authorization", "Bearer " + t)
                .contentType("application/json").content("{\"durationMin\":60}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.xpTotal", is(60)))
            .andExpect(jsonPath("$.level", is(1)));

        // 2nd practice 120 min same day -> xp 180, level 2
        mvc.perform(post("/me/practices").header("Authorization", "Bearer " + t)
                .contentType("application/json").content("{\"durationMin\":120}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.xpTotal", is(180)))
            .andExpect(jsonPath("$.level", is(2)));

        // dashboard reflects
        mvc.perform(get("/me/dashboard").header("Authorization", "Bearer " + t))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.xp", is(180)))
            .andExpect(jsonPath("$.level", is(2)))
            .andExpect(jsonPath("$.weeklyPracticeMin", is(180)));
        mvc.perform(get("/me/practices").header("Authorization", "Bearer " + t))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()", is(2)))
            .andExpect(jsonPath("$[0].durationMin", is(120)));
        mvc.perform(get("/me/attendance").header("Authorization", "Bearer " + t))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()", is(0)));

        // goal: create (target 2) -> complete
        String goal = postId(t, "/me/goals",
            "{\"title\":\"Study\",\"type\":\"LESSONS\",\"target\":2}");
        mvc.perform(put("/me/goals/" + goal + "?progress=-1").header("Authorization", "Bearer " + t))
            .andExpect(status().isBadRequest());
        mvc.perform(put("/me/goals/" + goal + "?progress=2").header("Authorization", "Bearer " + t))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status", is("COMPLETED")));

        // upcoming lessons (empty, no lesson) -> 200
        mvc.perform(get("/me/lessons?status=upcoming").header("Authorization", "Bearer " + t))
            .andExpect(status().isOk());

        String teacherToken = login("teacherA", "Teach@1234");
        String tomorrow = LocalDate.now().plusDays(1).toString();
        String lessonBody = "{\"enrollmentId\":\"" + enrollment + "\",\"date\":\"" + tomorrow + "\",\"startTime\":\"%s\",\"endTime\":\"%s\"}";
        String canceled = postId(teacherToken, "/teacher/lessons", lessonBody.formatted("08:00", "09:00"));
        postId(teacherToken, "/teacher/lessons", lessonBody.formatted("11:00", "12:00"));
        String earliest = postId(teacherToken, "/teacher/lessons", lessonBody.formatted("09:00", "10:00"));
        mvc.perform(patch("/teacher/lessons/" + canceled + "/status").header("Authorization", "Bearer " + teacherToken)
                .contentType("application/json").content("{\"status\":\"CANCELED\"}"))
            .andExpect(status().isOk());
        mvc.perform(get("/me/dashboard").header("Authorization", "Bearer " + t))
            .andExpect(status().isOk()).andExpect(jsonPath("$.nextLesson.id", is(earliest)));
    }
}
