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

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Covers the lesson-core scheduling and lifecycle rules as seen through the teacher API. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class LessonSchedulingIT {

    private static final String TEACHER_PASSWORD = "Teach@1234";

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

    /** Creates an isolated teacher/student pair and returns the enrollment id. */
    private String enrollmentFor(String suffix) throws Exception {
        String admin = login("admin", "Admin@123");
        String instrument = postId(admin, "/admin/instruments", "{\"name\":\"Instrument " + suffix + "\"}");
        String teacher = postId(admin, "/admin/teachers",
            "{\"username\":\"teacher" + suffix + "\",\"email\":\"" + suffix + "@h.local\",\"password\":\""
                + TEACHER_PASSWORD + "\",\"name\":\"Teacher " + suffix + "\"}");
        String student = postId(admin, "/admin/students",
            "{\"username\":\"student" + suffix + "\",\"email\":\"st" + suffix + "@h.local\","
                + "\"password\":\"Student@123\",\"name\":\"Student " + suffix + "\"}");
        return postId(admin, "/admin/enrollments",
            "{\"studentId\":\"" + student + "\",\"teacherId\":\"" + teacher + "\",\"instrumentId\":\""
                + instrument + "\"}");
    }

    private String lessonBody(String enrollment, String date, String start, String end) {
        return "{\"enrollmentId\":\"" + enrollment + "\",\"date\":\"" + date + "\",\"startTime\":\"" + start
            + "\",\"endTime\":\"" + end + "\",\"content\":\"Practice\"}";
    }

    private String makeupOf(String token, String lessonId, String date, String start, String end) throws Exception {
        String body = mvc.perform(post("/teacher/lessons/" + lessonId + "/makeup")
                .header("Authorization", "Bearer " + token).contentType("application/json")
                .content("{\"date\":\"" + date + "\",\"startTime\":\"" + start + "\",\"endTime\":\"" + end
                    + "\",\"reason\":\"Aluno faltou\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.newLesson.id");
    }

    @Test
    void teacher_cannotRegisterOverlappingLessons() throws Exception {
        String enrollment = enrollmentFor("Ovl");
        String t = login("teacherOvl", TEACHER_PASSWORD);
        String today = LocalDate.now().toString();

        postId(t, "/teacher/lessons", lessonBody(enrollment, today, "09:00", "10:00"));

        mvc.perform(post("/teacher/lessons").header("Authorization", "Bearer " + t)
                .contentType("application/json").content(lessonBody(enrollment, today, "09:30", "10:30")))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("SCHEDULE_CONFLICT")));
    }

    @Test
    void teacher_canRegisterBackToBackLessons() throws Exception {
        String enrollment = enrollmentFor("Btb");
        String t = login("teacherBtb", TEACHER_PASSWORD);
        String today = LocalDate.now().toString();

        postId(t, "/teacher/lessons", lessonBody(enrollment, today, "09:00", "10:00"));

        mvc.perform(post("/teacher/lessons").header("Authorization", "Bearer " + t)
                .contentType("application/json").content(lessonBody(enrollment, today, "10:00", "11:00")))
            .andExpect(status().isOk());
    }

    @Test
    void teacher_cannotRegisterLessonEndingBeforeItStarts() throws Exception {
        String enrollment = enrollmentFor("Inv");
        String t = login("teacherInv", TEACHER_PASSWORD);
        String today = LocalDate.now().toString();

        mvc.perform(post("/teacher/lessons").header("Authorization", "Bearer " + t)
                .contentType("application/json").content(lessonBody(enrollment, today, "11:00", "10:00")))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code", is("DOMAIN_VALIDATION")));
    }

    @Test
    void teacher_completesScheduledMakeupButCannotReopenIt() throws Exception {
        String enrollment = enrollmentFor("Lif");
        String t = login("teacherLif", TEACHER_PASSWORD);
        String today = LocalDate.now().toString();

        String original = postId(t, "/teacher/lessons", lessonBody(enrollment, today, "09:00", "10:00"));
        String makeupLesson = makeupOf(t, original, today, "11:00", "12:00");

        mvc.perform(patch("/teacher/lessons/" + makeupLesson + "/status").header("Authorization", "Bearer " + t)
                .contentType("application/json").content("{\"status\":\"DONE\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status", is("DONE")));

        mvc.perform(patch("/teacher/lessons/" + makeupLesson + "/status").header("Authorization", "Bearer " + t)
                .contentType("application/json").content("{\"status\":\"SCHEDULED\"}"))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code", is("DOMAIN_VALIDATION")));
    }

    @Test
    void canceledLessonFreesTheSlot() throws Exception {
        String enrollment = enrollmentFor("Cnl");
        String t = login("teacherCnl", TEACHER_PASSWORD);
        String today = LocalDate.now().toString();

        String original = postId(t, "/teacher/lessons", lessonBody(enrollment, today, "09:00", "10:00"));
        String makeupLesson = makeupOf(t, original, today, "14:00", "15:00");

        mvc.perform(patch("/teacher/lessons/" + makeupLesson + "/status").header("Authorization", "Bearer " + t)
                .contentType("application/json").content("{\"status\":\"CANCELED\"}"))
            .andExpect(status().isOk());

        mvc.perform(post("/teacher/lessons").header("Authorization", "Bearer " + t)
                .contentType("application/json").content(lessonBody(enrollment, today, "14:00", "15:00")))
            .andExpect(status().isOk());
    }
}
