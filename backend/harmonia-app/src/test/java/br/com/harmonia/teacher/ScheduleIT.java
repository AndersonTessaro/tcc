package br.com.harmonia.teacher;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ScheduleIT {

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
    void teacher_createsAndListsSchedule() throws Exception {
        String admin = login("admin", "Admin@123");
        String inst = postId(admin, "/admin/instruments", "{\"name\":\"Violin\"}");
        String teacher = postId(admin, "/admin/teachers",
            "{\"username\":\"teacherSch\",\"email\":\"sch@h.local\",\"password\":\"Teach@1234\",\"name\":\"Teacher Sch\"}");
        String student = postId(admin, "/admin/students",
            "{\"username\":\"studentSch\",\"email\":\"stsch@h.local\",\"password\":\"Student@123\",\"name\":\"Student Sch\"}");
        String enrollment = postId(admin, "/admin/enrollments",
            "{\"studentId\":\"" + student + "\",\"teacherId\":\"" + teacher + "\",\"instrumentId\":\"" + inst + "\"}");

        String t = login("teacherSch", "Teach@1234");

        mvc.perform(post("/teacher/schedules").header("Authorization", "Bearer " + t)
                .contentType("application/json")
                .content("{\"enrollmentId\":\"" + enrollment + "\",\"weekday\":\"MONDAY\",\"startTime\":\"14:00\",\"endTime\":\"15:00\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.weekday", is("MONDAY")));

        mvc.perform(get("/teacher/schedules").header("Authorization", "Bearer " + t))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()", greaterThanOrEqualTo(1)));
    }
}
