package br.com.harmonia.teacher;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static br.com.harmonia.SchoolTestSupport.school;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class LessonRecurrenceIT {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;

    private String admin;
    private String teacher;
    private String teacherId;
    private String instrument;
    private String enrollment;
    private LocalDate first;

    @BeforeEach
    void createEnrollment() throws Exception {
        String suffix = UUID.randomUUID().toString();
        admin = login("admin", "Admin@123");
        instrument = postId(admin, "/admin/instruments", "{\"name\":\"Recurrence " + suffix + "\"}");
        String username = "recTeacher" + suffix;
        teacherId = postId(admin, "/admin/teachers", """
            {"username":"%s","email":"%s@h.local","password":"Teach@1234",
             "name":"Recurrence Teacher","instrumentIds":["%s"]}
            """.formatted(username, username, instrument));
        enrollment = enrollStudent(teacherId);
        teacher = login(username, "Teach@1234");
        first = LocalDate.now().plusYears(3).withMonth(1).withDayOfMonth(31);
    }

    private String enrollStudent(String targetTeacher) throws Exception {
        String username = "recStudent" + UUID.randomUUID();
        String student = postId(admin, "/admin/students", """
            {"username":"%s","email":"%s@h.local","password":"Student@123","name":"Recurrence Student"}
            """.formatted(username, username));
        return postId(admin, "/admin/enrollments", """
            {"studentId":"%s","teacherId":"%s","instrumentId":"%s"}
            """.formatted(student, targetTeacher, instrument));
    }

    private String login(String username, String password) throws Exception {
        String body = mvc.perform(post("/auth/login").contentType("application/json").content("""
                {"login":"%s","password":"%s"}
                """.formatted(username, password)))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    private String postId(String token, String path, String json) throws Exception {
        String body = mvc.perform(post(path).with(school(mvc)).header("Authorization", "Bearer " + token)
                .contentType("application/json").content(json))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    private ResultActions create(LocalDate date, String extraFields) throws Exception {
        return mvc.perform(post("/teacher/lessons").header("Authorization", "Bearer " + teacher)
            .contentType("application/json").content("""
                {"enrollmentId":"%s","date":"%s","startTime":"09:00","endTime":"10:00"%s}
                """.formatted(enrollment, date, extraFields)));
    }

    private String recurrence(String recurrence, LocalDate until) {
        return ",\"recurrence\":\"" + recurrence + "\",\"repeatUntil\":\"" + until + "\"";
    }

    private List<LocalDate> storedDates() {
        return jdbc.query("select date from lesson where enrollment_id = ? order by date",
            (rs, row) -> rs.getObject("date", LocalDate.class), UUID.fromString(enrollment));
    }

    private void assertSeries(String body, List<LocalDate> dates) throws Exception {
        UUID seriesId = UUID.fromString(JsonPath.read(body, "$.seriesId"));
        String lessonId = JsonPath.read(body, "$.id");
        assertThat(JsonPath.<Integer>read(body, "$.occurrences")).isEqualTo(dates.size());
        assertThat(JsonPath.<String>read(body, "$.date")).isEqualTo(dates.getFirst().toString());
        assertThat(storedDates()).containsExactlyElementsOf(dates);
        assertThat(jdbc.queryForList("select series_id from lesson where enrollment_id = ? order by date",
            UUID.class, UUID.fromString(enrollment))).containsOnly(seriesId).hasSize(dates.size());
        assertThat(jdbc.queryForList("select status from lesson where enrollment_id = ?",
            String.class, UUID.fromString(enrollment))).containsOnly("SCHEDULED");
        assertThat(jdbc.queryForList("select start_time::text || '-' || end_time::text from lesson where enrollment_id = ?",
            String.class, UUID.fromString(enrollment))).containsOnly("09:00:00-10:00:00");
        mvc.perform(get("/teacher/lessons").header("Authorization", "Bearer " + teacher)
                .param("start", dates.getFirst().toString()).param("end", dates.getLast().toString()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].occurrences").doesNotExist());
        mvc.perform(get("/teacher/lessons/" + lessonId).header("Authorization", "Bearer " + teacher))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.lesson.seriesId", is(seriesId.toString())))
            .andExpect(jsonPath("$.lesson.occurrences").doesNotExist());
    }

    @Test
    @DisplayName("POST /teacher/lessons creates a weekly series with content only on the first lesson")
    void newLesson_CreatesWeeklySeries_WhenRecurrenceIsWeekly() throws Exception {
        String body = create(first, recurrence("WEEKLY", first.plusWeeks(3))
                + ",\"content\":\"Scales\",\"homework\":\"Practice scales\"")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.seriesId", notNullValue()))
            .andExpect(jsonPath("$.content", is("Scales")))
            .andExpect(jsonPath("$.homework", is("Practice scales")))
            .andExpect(jsonPath("$.lesson").doesNotExist())
            .andReturn().getResponse().getContentAsString();

        assertSeries(body, List.of(first, first.plusWeeks(1), first.plusWeeks(2), first.plusWeeks(3)));
        List<Map<String, Object>> rows = jdbc.queryForList(
            "select content, homework from lesson where enrollment_id = ? order by date", UUID.fromString(enrollment));
        assertThat(rows.getFirst()).containsEntry("content", "Scales").containsEntry("homework", "Practice scales");
        assertThat(rows.subList(1, rows.size())).allSatisfy(row ->
            assertThat(row).containsEntry("content", null).containsEntry("homework", null));
    }

    @Test
    @DisplayName("POST /teacher/lessons creates a biweekly series")
    void newLesson_CreatesBiweeklySeries_WhenRecurrenceIsBiweekly() throws Exception {
        String body = create(first, recurrence("BIWEEKLY", first.plusDays(30)))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        assertSeries(body, List.of(first, first.plusDays(14), first.plusDays(28)));
    }

    @Test
    @DisplayName("POST /teacher/lessons creates a monthly series without drifting after February")
    void newLesson_PreservesMonthEnd_WhenRecurrenceIsMonthly() throws Exception {
        String body = create(first, recurrence("MONTHLY", first.plusMonths(3)))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        assertSeries(body, List.of(first, first.plusMonths(1), first.plusMonths(2), first.plusMonths(3)));
    }

    @Test
    @DisplayName("POST /teacher/lessons reports all conflicting series dates and persists no occurrences")
    void newLesson_RollsBackEntireSeries_WhenMultipleMiddleDatesConflict() throws Exception {
        create(first.plusWeeks(3), "").andExpect(status().isOk());
        create(first.plusWeeks(1), "").andExpect(status().isOk());

        create(first, recurrence("WEEKLY", first.plusWeeks(4)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.status", is(409)))
            .andExpect(jsonPath("$.code", is("SCHEDULE_CONFLICT")))
            .andExpect(jsonPath("$.timestamp", notNullValue()))
            .andExpect(jsonPath("$.fields", contains(first.plusWeeks(1).toString(), first.plusWeeks(3).toString())));

        assertThat(storedDates()).containsExactly(first.plusWeeks(1), first.plusWeeks(3));
        assertThat(jdbc.queryForObject("select count(*) from lesson where enrollment_id = ? and series_id is not null",
            Long.class, UUID.fromString(enrollment))).isZero();
    }

    @Test
    @DisplayName("POST /teacher/lessons reports each date blocked by another enrollment's fixed weekly schedule")
    void newLesson_ReportsConflictingDates_WhenAnotherEnrollmentHasFixedSchedule() throws Exception {
        String otherEnrollment = enrollStudent(teacherId);
        postId(teacher, "/teacher/schedules", """
            {"enrollmentId":"%s","weekday":"%s","startTime":"09:00","endTime":"10:00"}
            """.formatted(otherEnrollment, first.getDayOfWeek()));

        create(first, recurrence("WEEKLY", first.plusWeeks(2)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("SCHEDULE_CONFLICT")))
            .andExpect(jsonPath("$.fields", contains(first.toString(), first.plusWeeks(1).toString(),
                first.plusWeeks(2).toString())));

        assertThat(storedDates()).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"WEEKLY", "BIWEEKLY", "MONTHLY"})
    @DisplayName("POST /teacher/lessons rejects recurrence without repeatUntil")
    void newLesson_ReturnsDomainValidation_WhenRepeatUntilIsMissing(String recurrence) throws Exception {
        create(first, ",\"recurrence\":\"" + recurrence + "\"")
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code", is("DOMAIN_VALIDATION")));
        assertThat(storedDates()).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"WEEKLY", "BIWEEKLY", "MONTHLY"})
    @DisplayName("POST /teacher/lessons rejects repeatUntil before date")
    void newLesson_ReturnsDomainValidation_WhenRepeatUntilIsBeforeDate(String recurrence) throws Exception {
        create(first, recurrence(recurrence, first.minusDays(1)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code", is("DOMAIN_VALIDATION")));
        assertThat(storedDates()).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"WEEKLY", "BIWEEKLY", "MONTHLY"})
    @DisplayName("POST /teacher/lessons rejects repeatUntil more than twelve months after date")
    void newLesson_ReturnsDomainValidation_WhenRepeatUntilExceedsTwelveMonths(String recurrence) throws Exception {
        create(first, recurrence(recurrence, first.plusMonths(12).plusDays(1)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code", is("DOMAIN_VALIDATION")));
        assertThat(storedDates()).isEmpty();
    }

    @Test
    @DisplayName("POST /teacher/lessons creates one independent lesson when recurrence is omitted")
    void newLesson_CreatesSingleLesson_WhenRecurrenceIsOmitted() throws Exception {
        String body = create(first, ",\"content\":\"One lesson\",\"homework\":\"One task\"")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.seriesId", nullValue()))
            .andExpect(jsonPath("$.occurrences", is(1)))
            .andExpect(jsonPath("$.content", is("One lesson")))
            .andExpect(jsonPath("$.homework", is("One task")))
            .andReturn().getResponse().getContentAsString();

        assertThat(JsonPath.<Map<String, Object>>read(body, "$")).containsEntry("seriesId", null);
        assertThat(storedDates()).containsExactly(first);
        assertThat(jdbc.queryForObject("select count(*) from lesson where enrollment_id = ? and series_id is null",
            Long.class, UUID.fromString(enrollment))).isEqualTo(1);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = "NONE")
    @DisplayName("POST /teacher/lessons ignores repeatUntil for null or NONE recurrence")
    void newLesson_IgnoresRepeatUntil_WhenRecurrenceIsNullOrNone(String recurrence) throws Exception {
        String recurrenceJson = recurrence == null ? "null" : "\"" + recurrence + "\"";
        create(first, ",\"recurrence\":" + recurrenceJson + ",\"repeatUntil\":\"" + first.minusDays(1) + "\"")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.seriesId", nullValue()))
            .andExpect(jsonPath("$.occurrences", is(1)));
        assertThat(storedDates()).containsExactly(first);
    }

    @Test
    @DisplayName("POST /teacher/lessons succeeds without content, homework or attendance")
    void newLesson_CreatesLessonWithoutAttendance_WhenContentAndHomeworkAreOmitted() throws Exception {
        String body = create(first, "")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").doesNotExist())
            .andExpect(jsonPath("$.homework").doesNotExist())
            .andExpect(jsonPath("$.attendance").doesNotExist())
            .andReturn().getResponse().getContentAsString();
        String lessonId = JsonPath.read(body, "$.id");

        assertThat(jdbc.queryForMap("select content, homework from lesson where id = ?", UUID.fromString(lessonId)))
            .containsEntry("content", null).containsEntry("homework", null);
        assertThat(jdbc.queryForObject("select count(*) from attendance where lesson_id = ?",
            Long.class, UUID.fromString(lessonId))).isZero();
    }

    @Test
    @DisplayName("POST /teacher/lessons preserves the policy message and empty fields for a single-lesson conflict")
    void newLesson_PreservesSingleConflictResponse_WhenRecurrenceIsOmitted() throws Exception {
        create(first, "").andExpect(status().isOk());

        create(first, "")
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("SCHEDULE_CONFLICT")))
            .andExpect(jsonPath("$.message", is("Teacher or student already has a lesson in this time range")))
            .andExpect(jsonPath("$.fields", is(List.of())));
        assertThat(storedDates()).containsExactly(first);
    }

    @Test
    @DisplayName("POST /teacher/lessons creates a series over a canceled occurrence")
    void newLesson_CreatesSeries_WhenConflictingLessonIsCanceled() throws Exception {
        String body = create(first.plusWeeks(1), "")
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.id");
        mvc.perform(patch("/teacher/lessons/" + id + "/status").header("Authorization", "Bearer " + teacher)
                .contentType("application/json").content("{\"status\":\"CANCELED\"}"))
            .andExpect(status().isOk());

        create(first, recurrence("WEEKLY", first.plusWeeks(2)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.occurrences", is(3)));
        assertThat(storedDates()).containsExactly(first, first.plusWeeks(1), first.plusWeeks(1), first.plusWeeks(2));
    }
}
