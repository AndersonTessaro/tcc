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

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

    /** Two students enrolled with the same teacher; returns both enrollment ids. */
    private String[] enrollmentsSharingTeacher(String suffix) throws Exception {
        String admin = login("admin", "Admin@123");
        String instrument = postId(admin, "/admin/instruments", "{\"name\":\"Instrument " + suffix + "\"}");
        String teacher = postId(admin, "/admin/teachers",
            "{\"username\":\"teacher" + suffix + "\",\"email\":\"" + suffix + "@h.local\",\"password\":\""
                + TEACHER_PASSWORD + "\",\"name\":\"Teacher " + suffix + "\"}");
        String[] enrollments = new String[2];
        for (int i = 0; i < 2; i++) {
            String student = postId(admin, "/admin/students",
                "{\"username\":\"student" + suffix + i + "\",\"email\":\"st" + suffix + i + "@h.local\","
                    + "\"password\":\"Student@123\",\"name\":\"Student " + suffix + i + "\"}");
            enrollments[i] = postId(admin, "/admin/enrollments",
                "{\"studentId\":\"" + student + "\",\"teacherId\":\"" + teacher + "\",\"instrumentId\":\""
                    + instrument + "\"}");
        }
        return enrollments;
    }

    private String scheduleBody(String enrollment, String weekday, String start, String end) {
        return "{\"enrollmentId\":\"" + enrollment + "\",\"weekday\":\"" + weekday + "\",\"startTime\":\""
            + start + "\",\"endTime\":\"" + end + "\"}";
    }

    private void setScheduleActive(String token, String scheduleId, boolean active, int expectedStatus)
            throws Exception {
        mvc.perform(patch("/teacher/schedules/" + scheduleId + "/active").header("Authorization", "Bearer " + token)
                .contentType("application/json").content("{\"active\":" + active + "}"))
            .andExpect(status().is(expectedStatus));
    }

    private void attendance(String token, String lessonId, int expectedStatus) throws Exception {
        mvc.perform(post("/teacher/lessons/" + lessonId + "/attendance").header("Authorization", "Bearer " + token)
                .contentType("application/json").content("{\"status\":\"PRESENT\"}"))
            .andExpect(status().is(expectedStatus));
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
    void teacher_registersLessonInsideItsOwnRecurringSchedule() throws Exception {
        String enrollment = enrollmentFor("Rec");
        String t = login("teacherRec", TEACHER_PASSWORD);
        LocalDate today = LocalDate.now();

        postId(t, "/teacher/schedules", "{\"enrollmentId\":\"" + enrollment + "\",\"weekday\":\""
            + today.getDayOfWeek().name() + "\",\"startTime\":\"10:00\",\"endTime\":\"11:00\"}");

        mvc.perform(post("/teacher/lessons").header("Authorization", "Bearer " + t)
                .contentType("application/json").content(lessonBody(enrollment, today.toString(), "10:00", "11:00")))
            .andExpect(status().isOk());
    }

    @Test
    void attendance_isRejectedForCanceledLesson() throws Exception {
        String enrollment = enrollmentFor("AtC");
        String t = login("teacherAtC", TEACHER_PASSWORD);
        String today = LocalDate.now().toString();

        String original = postId(t, "/teacher/lessons", lessonBody(enrollment, today, "09:00", "10:00"));
        String makeupLesson = makeupOf(t, original, today, "11:00", "12:00");
        mvc.perform(patch("/teacher/lessons/" + makeupLesson + "/status").header("Authorization", "Bearer " + t)
                .contentType("application/json").content("{\"status\":\"CANCELED\"}"))
            .andExpect(status().isOk());

        attendance(t, makeupLesson, 422);
        attendance(t, original, 200);
    }

    @Test
    void attendance_isRejectedBeforeTheLessonDate() throws Exception {
        String enrollment = enrollmentFor("AtF");
        String t = login("teacherAtF", TEACHER_PASSWORD);
        LocalDate today = LocalDate.now();

        String original = postId(t, "/teacher/lessons", lessonBody(enrollment, today.toString(), "09:00", "10:00"));
        String makeupLesson = makeupOf(t, original, today.plusDays(1).toString(), "09:00", "10:00");

        attendance(t, makeupLesson, 422);
    }

    @Test
    void attendance_forUnknownLesson_is404() throws Exception {
        String t = login("admin", "Admin@123");

        mvc.perform(post("/teacher/lessons/" + UUID.randomUUID() + "/attendance")
                .header("Authorization", "Bearer " + t)
                .contentType("application/json").content("{\"status\":\"PRESENT\"}"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code", is("NOT_FOUND")));
    }

    @Test
    void reactivatingSchedule_isRejectedWhenSlotWasTakenMeanwhile() throws Exception {
        String enrollment = enrollmentFor("Rea");
        String t = login("teacherRea", TEACHER_PASSWORD);

        String first = postId(t, "/teacher/schedules", scheduleBody(enrollment, "MONDAY", "10:00", "11:00"));
        setScheduleActive(t, first, false, 200);
        postId(t, "/teacher/schedules", scheduleBody(enrollment, "MONDAY", "10:30", "11:30"));

        setScheduleActive(t, first, true, 409);
    }

    @Test
    void recurringSchedule_isRejectedOverAnotherStudentsUpcomingLesson() throws Exception {
        String[] enrollments = enrollmentsSharingTeacher("Upc");
        String t = login("teacherUpc", TEACHER_PASSWORD);
        LocalDate today = LocalDate.now();
        LocalDate nextWeek = today.plusDays(7);

        String original = postId(t, "/teacher/lessons", lessonBody(enrollments[0], today.toString(), "08:00", "09:00"));
        makeupOf(t, original, nextWeek.toString(), "10:00", "11:00");

        mvc.perform(post("/teacher/schedules").header("Authorization", "Bearer " + t)
                .contentType("application/json")
                .content(scheduleBody(enrollments[1], nextWeek.getDayOfWeek().name(), "10:30", "11:30")))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("SCHEDULE_CONFLICT")));
    }

    @Test
    void lessonAndMakeupResponses_doNotExposePersistenceGraph() throws Exception {
        String enrollment = enrollmentFor("Dto");
        String t = login("teacherDto", TEACHER_PASSWORD);
        String today = LocalDate.now().toString();

        String body = mvc.perform(post("/teacher/lessons").header("Authorization", "Bearer " + t)
                .contentType("application/json").content(lessonBody(enrollment, today, "09:00", "10:00")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.enrollment").doesNotExist())
            .andExpect(jsonPath("$.enrollmentId", is(enrollment)))
            .andExpect(jsonPath("$.studentName", is("Student Dto")))
            .andExpect(jsonPath("$.teacherName", is("Teacher Dto")))
            .andExpect(jsonPath("$.instrument", is("Instrument Dto")))
            .andReturn().getResponse().getContentAsString();
        String lessonId = JsonPath.read(body, "$.id");

        mvc.perform(post("/teacher/lessons/" + lessonId + "/makeup").header("Authorization", "Bearer " + t)
                .contentType("application/json")
                .content("{\"date\":\"" + today + "\",\"startTime\":\"11:00\",\"endTime\":\"12:00\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.newLesson.enrollment").doesNotExist())
            .andExpect(jsonPath("$.newLesson.status", is("SCHEDULED")))
            .andExpect(jsonPath("$.originalLesson.id", is(lessonId)));

        mvc.perform(get("/teacher/students").header("Authorization", "Bearer " + t))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].name", is("Student Dto")))
            .andExpect(jsonPath("$[0].user").doesNotExist());
    }

    @Test
    void agenda_showsRecordedAttendanceInStartOrder() throws Exception {
        String enrollment = enrollmentFor("Agd");
        String t = login("teacherAgd", TEACHER_PASSWORD);
        String today = LocalDate.now().toString();

        String late = postId(t, "/teacher/lessons", lessonBody(enrollment, today, "15:00", "16:00"));
        String early = postId(t, "/teacher/lessons", lessonBody(enrollment, today, "08:00", "09:00"));
        attendance(t, late, 200);

        mvc.perform(get("/teacher/schedule").param("date", today).header("Authorization", "Bearer " + t))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id", is(early)))
            .andExpect(jsonPath("$[0].attendance").doesNotExist())
            .andExpect(jsonPath("$[1].id", is(late)))
            .andExpect(jsonPath("$[1].attendance", is("PRESENT")));
    }

    @Test
    void futureLesson_isRegisteredAsScheduled() throws Exception {
        String enrollment = enrollmentFor("Fut");
        String t = login("teacherFut", TEACHER_PASSWORD);
        String nextWeek = LocalDate.now().plusDays(7).toString();

        mvc.perform(post("/teacher/lessons").header("Authorization", "Bearer " + t)
                .contentType("application/json").content(lessonBody(enrollment, nextWeek, "09:00", "10:00")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status", is("SCHEDULED")));
    }

    @Test
    void canceledLesson_canReceiveMakeup() throws Exception {
        String enrollment = enrollmentFor("MkC");
        String t = login("teacherMkC", TEACHER_PASSWORD);
        LocalDate today = LocalDate.now();

        String future = postId(t, "/teacher/lessons",
            lessonBody(enrollment, today.plusDays(2).toString(), "09:00", "10:00"));
        mvc.perform(patch("/teacher/lessons/" + future + "/status").header("Authorization", "Bearer " + t)
                .contentType("application/json").content("{\"status\":\"CANCELED\"}"))
            .andExpect(status().isOk());

        makeupOf(t, future, today.plusDays(3).toString(), "09:00", "10:00");
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
