package br.com.harmonia.teacher;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class LessonEditIT {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;

    private String admin;
    private String teacher;
    private String enrollment;
    private String instrument;
    private String studentUsername;
    private LocalDate future;

    @BeforeEach
    void createEnrollment() throws Exception {
        String suffix = UUID.randomUUID().toString();
        admin = login("admin", "Admin@123");
        instrument = postId(admin, "/admin/instruments", "{\"name\":\"Instrument " + suffix + "\"}");
        String teacherUsername = "editTeacher" + suffix;
        String teacherId = createTeacher(teacherUsername);
        studentUsername = "editStudent" + suffix;
        String studentId = postId(admin, "/admin/students", """
            {"username":"%s","email":"%s@h.local","password":"Student@123","name":"Student Edit"}
            """.formatted(studentUsername, studentUsername));
        enrollment = postId(admin, "/admin/enrollments", """
            {"studentId":"%s","teacherId":"%s","instrumentId":"%s"}
            """.formatted(studentId, teacherId, instrument));
        teacher = login(teacherUsername, "Teach@1234");
        future = LocalDate.now().plusDays(2);
    }

    private String createTeacher(String username) throws Exception {
        return postId(admin, "/admin/teachers", """
            {"username":"%s","email":"%s@h.local","password":"Teach@1234",
             "name":"Teacher Edit","instrumentIds":["%s"]}
            """.formatted(username, username, instrument));
    }

    private String login(String username, String password) throws Exception {
        String body = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"" + username + "\",\"password\":\"" + password + "\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    private String postId(String token, String path, String json) throws Exception {
        String body = mvc.perform(post(path).header("Authorization", "Bearer " + token)
                .contentType("application/json").content(json))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    private String editBody(LocalDate date, String start, String end, String content, String homework) {
        return """
            {"date":"%s","startTime":"%s","endTime":"%s","content":"%s","homework":"%s"}
            """.formatted(date, start, end, content, homework);
    }

    private String newBody(LocalDate date, String start, String end, String content, String homework) {
        return "{\"enrollmentId\":\"" + enrollment + "\"," + editBody(date, start, end, content, homework).substring(1);
    }

    private String createLesson(LocalDate date, String start, String end) throws Exception {
        return postId(teacher, "/teacher/lessons", newBody(date, start, end, "Original", "Original homework"));
    }

    private ResultActions update(String token, String id, LocalDate date, String start, String end) throws Exception {
        return mvc.perform(put("/teacher/lessons/" + id).header("Authorization", "Bearer " + token)
            .contentType("application/json").content(editBody(date, start, end, "Edited", "Edited homework")));
    }

    private void assertOriginal(String id, LocalDate date) throws Exception {
        mvc.perform(get("/teacher/lessons/" + id).header("Authorization", "Bearer " + teacher))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.lesson.date", is(date.toString())))
            .andExpect(jsonPath("$.lesson.startTime", is("09:00:00")))
            .andExpect(jsonPath("$.lesson.endTime", is("10:00:00")))
            .andExpect(jsonPath("$.lesson.content", is("Original")))
            .andExpect(jsonPath("$.lesson.homework", is("Original homework")));
    }

    @Test
    void doneLessonAllowsContentAndHomeworkEdits() throws Exception {
        LocalDate past = LocalDate.now().minusDays(1);
        String id = createLesson(past, "09:00", "10:00");

        update(teacher, id, past, "09:00", "10:00")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status", is("DONE")))
            .andExpect(jsonPath("$.content", is("Edited")))
            .andExpect(jsonPath("$.homework", is("Edited homework")))
            .andExpect(jsonPath("$.enrollmentId", is(enrollment)));
        mvc.perform(get("/teacher/lessons/" + id).header("Authorization", "Bearer " + teacher))
            .andExpect(jsonPath("$.lesson.content", is("Edited")))
            .andExpect(jsonPath("$.lesson.homework", is("Edited homework")));
    }

    @Test
    void scheduledLessonCanMoveThirtyMinutesOverItsOwnSlot() throws Exception {
        String id = createLesson(future, "09:00", "10:00");

        update(teacher, id, future, "09:30", "10:30")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id", is(id)))
            .andExpect(jsonPath("$.startTime", is("09:30:00")))
            .andExpect(jsonPath("$.endTime", is("10:30:00")))
            .andExpect(jsonPath("$.status", is("SCHEDULED")));
    }

    @Test
    void movingOverAnotherLessonIsRejectedAndKeepsOriginal() throws Exception {
        String id = createLesson(future, "09:00", "10:00");
        createLesson(future, "10:00", "11:00");

        update(teacher, id, future, "09:30", "10:30")
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("SCHEDULE_CONFLICT")));
        assertOriginal(id, future);
    }

    @Test
    void doneLessonCannotChangeDateOrTime() throws Exception {
        LocalDate past = LocalDate.now().minusDays(1);
        String id = createLesson(past, "09:00", "10:00");

        update(teacher, id, future, "09:00", "10:00")
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code", is("DOMAIN_VALIDATION")))
            .andExpect(jsonPath("$.message", is("Only scheduled lessons can be rescheduled")));
        update(teacher, id, past, "09:30", "10:30")
            .andExpect(status().isUnprocessableEntity());
        assertOriginal(id, past);
    }

    @Test
    void canceledLessonIsReadOnly() throws Exception {
        String id = createLesson(future, "09:00", "10:00");
        mvc.perform(patch("/teacher/lessons/" + id + "/status").header("Authorization", "Bearer " + teacher)
                .contentType("application/json").content("{\"status\":\"CANCELED\"}"))
            .andExpect(status().isOk());

        update(teacher, id, future, "09:00", "10:00")
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code", is("DOMAIN_VALIDATION")))
            .andExpect(jsonPath("$.message", is("Canceled lessons cannot be edited")));
        assertOriginal(id, future);
    }

    @Test
    void anotherTeacherCannotReadOrUpdateLesson() throws Exception {
        String id = createLesson(future, "09:00", "10:00");
        String username = "editIntruder" + UUID.randomUUID();
        createTeacher(username);
        String intruder = login(username, "Teach@1234");

        mvc.perform(get("/teacher/lessons/" + id).header("Authorization", "Bearer " + intruder))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code", is("OWNERSHIP_DENIED")));
        update(intruder, id, future, "09:00", "10:00")
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code", is("OWNERSHIP_DENIED")));
        assertOriginal(id, future);
    }

    @ParameterizedTest
    @ValueSource(strings = {"content", "homework"})
    void oversizedTextIsValidationErrorOnCreateAndUpdate(String field) throws Exception {
        String id = createLesson(future, "09:00", "10:00");
        String content = field.equals("content") ? "x".repeat(1001) : "Valid";
        String homework = field.equals("homework") ? "x".repeat(1001) : "Valid";

        mvc.perform(put("/teacher/lessons/" + id).header("Authorization", "Bearer " + teacher)
                .contentType("application/json").content(editBody(future, "09:00", "10:00", content, homework)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code", is("VALIDATION")));
        mvc.perform(post("/teacher/lessons").header("Authorization", "Bearer " + teacher)
                .contentType("application/json").content(newBody(future, "11:00", "12:00", content, homework)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code", is("VALIDATION")));
        assertOriginal(id, future);
    }

    @Test
    void availabilityExcludesOwnLessonButKeepsOtherBusySlotsAndConflicts() throws Exception {
        String id = createLesson(future, "09:00", "10:00");
        String other = createLesson(future, "10:00", "11:00");

        mvc.perform(get("/teacher/lessons/availability").header("Authorization", "Bearer " + teacher)
                .param("enrollmentId", enrollment).param("date", future.toString())
                .param("startTime", "09:30").param("endTime", "10:30"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.busy.length()", is(2)))
            .andExpect(jsonPath("$.conflicts.length()", is(2)));
        mvc.perform(get("/teacher/lessons/availability").header("Authorization", "Bearer " + teacher)
                .param("enrollmentId", enrollment).param("date", future.toString()).param("lessonId", id)
                .param("startTime", "09:30").param("endTime", "10:30"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.busy.length()", is(1)))
            .andExpect(jsonPath("$.busy[0].referenceId", is(other)))
            .andExpect(jsonPath("$.conflicts.length()", is(1)))
            .andExpect(jsonPath("$.conflicts[0].referenceId", is(other)));
        mvc.perform(get("/teacher/lessons/availability").header("Authorization", "Bearer " + teacher)
                .param("enrollmentId", enrollment).param("date", future.toString()).param("lessonId", id)
                .param("startTime", "09:00").param("endTime", "10:00"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.available", is(true)))
            .andExpect(jsonPath("$.conflicts.length()", is(0)));
    }

    @Test
    void teacherAndStudentDetailsUseSameJsonShapeWithoutStoragePath() throws Exception {
        String id = createLesson(future, "09:00", "10:00");
        UUID attachmentId = UUID.randomUUID();
        jdbc.update("""
            INSERT INTO lesson_attachment (id, lesson_id, file_name, storage_path, content_type, size_bytes, created_at)
            VALUES (?, ?, 'score.pdf', 'private-storage-path', 'application/pdf', 42, CURRENT_TIMESTAMP)
            """, attachmentId, UUID.fromString(id));
        String teacherBody = mvc.perform(get("/teacher/lessons/" + id).header("Authorization", "Bearer " + teacher))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.lesson.id", is(id)))
            .andExpect(jsonPath("$.lesson.enrollment").doesNotExist())
            .andExpect(jsonPath("$.attachments[0].id", is(attachmentId.toString())))
            .andExpect(jsonPath("$.attachments[0].fileName", is("score.pdf")))
            .andExpect(jsonPath("$.attachments[0].contentType", is("application/pdf")))
            .andExpect(jsonPath("$.attachments[0].sizeBytes", is(42)))
            .andExpect(jsonPath("$.attachments[0].createdAt").isString())
            .andExpect(jsonPath("$.attachments[0].storagePath").doesNotExist())
            .andReturn().getResponse().getContentAsString();
        String student = login(studentUsername, "Student@123");
        String studentBody = mvc.perform(get("/me/lessons/" + id).header("Authorization", "Bearer " + student))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        Map<String, Object> teacherDetail = JsonPath.read(teacherBody, "$");
        Map<String, Object> studentDetail = JsonPath.read(studentBody, "$");
        assertThat(teacherDetail).containsOnlyKeys("lesson", "attachments");
        assertThat(studentDetail).isEqualTo(teacherDetail);
        mvc.perform(get("/teacher/lessons/" + id).header("Authorization", "Bearer " + student))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code", is("PROFILE_REQUIRED")));
        update(student, id, future, "09:00", "10:00").andExpect(status().isForbidden());
    }

    @Test
    void adminWithoutTeacherProfileCanReadAndReschedule() throws Exception {
        String id = createLesson(future, "09:00", "10:00");

        mvc.perform(get("/teacher/lessons/" + id).header("Authorization", "Bearer " + admin))
            .andExpect(status().isOk()).andExpect(jsonPath("$.lesson.id", is(id)));
        update(admin, id, future, "09:30", "10:30")
            .andExpect(status().isOk()).andExpect(jsonPath("$.status", is("SCHEDULED")));
    }

    @Test
    void unknownLessonReturnsNotFoundForReadAndUpdate() throws Exception {
        String id = UUID.randomUUID().toString();

        mvc.perform(get("/teacher/lessons/" + id).header("Authorization", "Bearer " + teacher))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.code", is("NOT_FOUND")));
        update(teacher, id, future, "09:00", "10:00")
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.code", is("NOT_FOUND")));
    }

    @Test
    void scheduledLessonWithAttendanceCannotBeRescheduled() throws Exception {
        String id = createLesson(future, "09:00", "10:00");
        LocalDate today = LocalDate.now();
        update(teacher, id, today, "00:00", "01:00")
            .andExpect(status().isOk()).andExpect(jsonPath("$.status", is("SCHEDULED")));
        mvc.perform(post("/teacher/lessons/" + id + "/attendance").header("Authorization", "Bearer " + teacher)
                .contentType("application/json").content("{\"status\":\"PRESENT\"}"))
            .andExpect(status().isOk());

        update(teacher, id, future, "09:00", "10:00")
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code", is("DOMAIN_VALIDATION")))
            .andExpect(jsonPath("$.message", is("Lesson with recorded attendance cannot be rescheduled")));
        mvc.perform(get("/teacher/lessons/" + id).header("Authorization", "Bearer " + teacher))
            .andExpect(jsonPath("$.lesson.date", is(today.toString())));
    }

    @Test
    void rescheduleRejectsPastDateAndInvalidTimeRange() throws Exception {
        String id = createLesson(future, "09:00", "10:00");

        update(teacher, id, LocalDate.now().minusDays(1), "09:00", "10:00")
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code", is("DOMAIN_VALIDATION")))
            .andExpect(jsonPath("$.message", is("Lesson cannot be moved to a past date")));
        update(teacher, id, future, "11:00", "10:00")
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code", is("DOMAIN_VALIDATION")));
        assertOriginal(id, future);
    }
}
