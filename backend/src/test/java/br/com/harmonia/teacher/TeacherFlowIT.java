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
import java.util.UUID;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class TeacherFlowIT {

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
    void teacher_lesson_attendance_schedule_ownership() throws Exception {
        String admin = login("admin", "Admin@123");
        String inst = postId(admin, "/admin/instruments", "{\"name\":\"Guitar\"}");
        String teacher = postId(admin, "/admin/teachers",
            "{\"username\":\"teacherP\",\"email\":\"teacherP@h.local\",\"password\":\"Teach@1234\",\"name\":\"Teacher P\"}");
        String student = postId(admin, "/admin/students",
            "{\"username\":\"studentP\",\"email\":\"studentP@h.local\",\"password\":\"Student@123\",\"name\":\"Student P\"}");
        String enrollment = postId(admin, "/admin/enrollments",
            "{\"studentId\":\"" + student + "\",\"teacherId\":\"" + teacher + "\",\"instrumentId\":\"" + inst + "\"}");

        String t = login("teacherP", "Teach@1234");
        String today = LocalDate.now().toString();

        // linked students
        mvc.perform(get("/teacher/students").header("Authorization", "Bearer " + t))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()", greaterThanOrEqualTo(1)));

        // new lesson
        String lessonBody = mvc.perform(post("/teacher/lessons").header("Authorization", "Bearer " + t)
                .contentType("application/json")
                .content("{\"enrollmentId\":\"" + enrollment + "\",\"date\":\"" + today
                    + "\",\"startTime\":\"10:00\",\"content\":\"Scale\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String lessonId = JsonPath.read(lessonBody, "$.id");

        // attendance PRESENT
        mvc.perform(post("/teacher/lessons/" + lessonId + "/attendance").header("Authorization", "Bearer " + t)
                .contentType("application/json").content("{\"status\":\"PRESENT\"}"))
            .andExpect(status().isOk());

        // schedule for the day contains the lesson
        mvc.perform(get("/teacher/schedule?date=" + today).header("Authorization", "Bearer " + t))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()", greaterThanOrEqualTo(1)));

        // report aggregation for the linked student (RF18)
        mvc.perform(get("/teacher/students/" + student).header("Authorization", "Bearer " + t))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.lessonsCount", greaterThanOrEqualTo(1)))
            .andExpect(jsonPath("$.attendance.present", greaterThanOrEqualTo(1)))
            .andExpect(jsonPath("$.attendance.rate", greaterThanOrEqualTo(0)))
            .andExpect(jsonPath("$.goals.active", notNullValue()));

        // ownership: student not linked -> 403
        mvc.perform(get("/teacher/students/" + UUID.randomUUID()).header("Authorization", "Bearer " + t))
            .andExpect(status().isForbidden());
    }
}
