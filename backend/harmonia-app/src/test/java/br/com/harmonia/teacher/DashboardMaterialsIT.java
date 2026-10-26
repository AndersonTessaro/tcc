package br.com.harmonia.teacher;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.nio.file.Path;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class DashboardMaterialsIT extends MoreMenuITSupport {
    @TempDir static Path storageDir;
    private String teacherToken;
    private String studentToken;
    private String studentId;
    private String enrollment;
    private String instrument;
    private final LocalDate appToday = LocalDate.now(ZoneId.of("America/Sao_Paulo"));

    @DynamicPropertySource
    static void storage(DynamicPropertyRegistry registry) {
        registry.add("app.storage.local-dir", () -> storageDir.toString());
    }

    @BeforeEach
    void setUp() throws Exception {
        instrument = instrument();
        String teacherId = teacher("dashboardT", instrument);
        studentId = student("dashboardS");
        enrollment = enroll(studentId, teacherId, instrument, "null");
        teacherToken = login("dashboardT" + suffix, "Teach@1234");
        studentToken = login("dashboardS" + suffix, "Student@123");
    }

    @Test
    void teacherDashboardIncludesRecordedAttendance() throws Exception {
        String id = lesson(teacherToken, enrollment, today, "00:00", "00:01");
        mvc.perform(post("/teacher/lessons/" + id + "/attendance")
                .header("Authorization", "Bearer " + teacherToken).contentType("application/json")
                .content("{\"status\":\"PRESENT\"}"))
            .andExpect(status().isOk());

        mvc.perform(get("/teacher/dashboard").header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.todayLessons[?(@.id == '%s')].attendance".formatted(id), contains("PRESENT")));
    }

    @Test
    void studentDashboardIncludesFutureLesson() throws Exception {
        String id = lesson(teacherToken, enrollment, appToday.plusDays(2), "09:00", "10:00");
        mvc.perform(get("/me/dashboard").header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.nextLesson.id").value(id))
            .andExpect(jsonPath("$.nextLesson.fromSchedule").value(false));
    }

    @Test
    void studentDashboardIncludesFixedScheduleWithoutCreatingLesson() throws Exception {
        postId(teacherToken, "/teacher/schedules", """
            {"enrollmentId":"%s","weekday":"%s","startTime":"09:00","endTime":"10:00"}
            """.formatted(enrollment, appToday.plusDays(1).getDayOfWeek().name()));
        mvc.perform(get("/me/dashboard").header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.nextLesson.id").value(nullValue()))
            .andExpect(jsonPath("$.nextLesson.fromSchedule").value(true))
            .andExpect(jsonPath("$.nextLesson.enrollmentId").value(enrollment))
            .andExpect(jsonPath("$.nextLesson.date").value(appToday.plusDays(1).toString()));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM lesson WHERE enrollment_id = ?",
            Integer.class, UUID.fromString(enrollment))).isZero();
    }

    @Test
    void startedLessonTodayIsExcluded() throws Exception {
        String id = lesson(teacherToken, enrollment, appToday, "00:00", "00:01");
        jdbc.update("UPDATE lesson SET status = 'SCHEDULED' WHERE id = ?", UUID.fromString(id));
        mvc.perform(get("/me/dashboard").header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.nextLesson").value(nullValue()));
    }

    @Test
    void inactiveSchedulesAndClosedEnrollmentsAreExcluded() throws Exception {
        String id = postId(teacherToken, "/teacher/schedules", """
            {"enrollmentId":"%s","weekday":"%s","startTime":"09:00","endTime":"10:00"}
            """.formatted(enrollment, appToday.plusDays(1).getDayOfWeek().name()));
        jdbc.update("UPDATE schedule SET active = FALSE WHERE id = ?", UUID.fromString(id));
        mvc.perform(get("/me/dashboard").header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.nextLesson").value(nullValue()));
        jdbc.update("UPDATE schedule SET active = TRUE WHERE id = ?", UUID.fromString(id));
        jdbc.update("UPDATE enrollment SET status = 'CLOSED' WHERE id = ?", UUID.fromString(enrollment));
        mvc.perform(get("/me/dashboard").header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.nextLesson").value(nullValue()));
    }

    @Test
    void materialsIncludeLessonAttachmentsAndSearchWhileRespectingOwnership() throws Exception {
        String lessonId = lesson(teacherToken, enrollment, today.plusDays(2), "09:00", "10:00");
        var pdf = new MockMultipartFile("file", "Score.PDF", "application/pdf", "%PDF-1.7 score".getBytes());
        String response = mvc.perform(multipart("/teacher/lessons/" + lessonId + "/attachments").file(pdf)
                .header("Authorization", "Bearer " + teacherToken)).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        String attachmentId = JsonPath.read(response, "$.id");
        mvc.perform(multipart("/teacher/students/" + studentId + "/materials").file(pdf).param("title", "Exercise")
                .header("Authorization", "Bearer " + teacherToken)).andExpect(status().isOk());
        for (String path : new String[]{"/me/materials", "/teacher/students/" + studentId + "/materials"}) {
            String token = path.startsWith("/me") ? studentToken : teacherToken;
            mvc.perform(get(path).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].source").value("MATERIAL"))
                .andExpect(jsonPath("$[?(@.source == 'LESSON')].id", contains(attachmentId)))
                .andExpect(jsonPath("$[?(@.source == 'LESSON')].lessonId", contains(lessonId)))
                .andExpect(jsonPath("$[?(@.source == 'LESSON')].title", contains("Score.PDF")))
                .andExpect(jsonPath("$[?(@.source == 'LESSON')].lessonDate", contains(today.plusDays(2).toString())))
                .andExpect(jsonPath("$[0].storagePath").doesNotHaveJsonPath());
        }
        mvc.perform(get("/me/materials?search=sCoRe").header("Authorization", "Bearer " + studentToken))
            .andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].id").value(attachmentId));
        mvc.perform(get("/me/materials?search=missing").header("Authorization", "Bearer " + studentToken))
            .andExpect(jsonPath("$", hasSize(0)));

        student("dashboardOtherS");
        String otherStudent = login("dashboardOtherS" + suffix, "Student@123");
        mvc.perform(get("/me/materials").header("Authorization", "Bearer " + otherStudent))
            .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));
        String otherTeacherId = teacher("dashboardOtherT", instrument);
        enroll(studentId, otherTeacherId, instrument, "null");
        String otherTeacher = login("dashboardOtherT" + suffix, "Teach@1234");
        mvc.perform(get("/teacher/students/" + studentId + "/materials").header("Authorization", "Bearer " + otherTeacher))
            .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.source == 'LESSON')]", hasSize(0)));
        mvc.perform(get("/teacher/students/" + studentId + "/materials").header("Authorization", "Bearer " + admin))
            .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.source == 'LESSON')]", hasSize(1)));
        mvc.perform(get("/me/lessons/" + lessonId + "/attachments/" + attachmentId)
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk()).andExpect(content().bytes(pdf.getBytes()));
    }
}
