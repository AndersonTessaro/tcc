package br.com.harmonia.notification;

import br.com.harmonia.application.notification.NotificationJobs;
import br.com.harmonia.infrastructure.config.NotificationSchedulingConfiguration;
import br.com.harmonia.teacher.MoreMenuITSupport;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.endsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class NotificationsIT extends MoreMenuITSupport {
    @Autowired NotificationJobs jobs;
    @Autowired ApplicationContext context;
    private String teacherToken;
    private String otherToken;
    private String closedToken;
    private String studentToken;
    private String studentId;
    private String enrollment;
    private UUID teacherUserId;

    @BeforeEach
    void setUp() throws Exception {
        String instrument = instrument();
        String teacherId = teacher("notifyA", instrument);
        teacher("notifyB", instrument);
        String closed = teacher("notifyClosed", instrument);
        studentId = student("NotifyAna");
        enrollment = enroll(studentId, teacherId, instrument, "null");
        String closedEnrollment = enroll(studentId, closed, instrument, "null");
        jdbc.update("UPDATE enrollment SET status = 'CLOSED' WHERE id = ?", UUID.fromString(closedEnrollment));
        String secondInstrument = postId(admin, "/admin/instruments", """
            {"name":"Violin-%s"}
            """.formatted(suffix));
        jdbc.update("INSERT INTO teacher_instrument (teacher_id, instrument_id) VALUES (?, ?)",
            UUID.fromString(teacherId), UUID.fromString(secondInstrument));
        enroll(studentId, teacherId, secondInstrument, "null");
        teacherToken = login("notifyA" + suffix, "Teach@1234");
        otherToken = login("notifyB" + suffix, "Teach@1234");
        closedToken = login("notifyClosed" + suffix, "Teach@1234");
        studentToken = login("NotifyAna" + suffix, "Student@123");
        teacherUserId = jdbc.queryForObject("SELECT user_id FROM teacher WHERE id = ?", UUID.class, UUID.fromString(teacherId));
    }

    @Test
    void practiceCreatesOneNotificationOnlyForEachActiveLinkedTeacher() throws Exception {
        String practiceId = registerPractice();
        mvc.perform(get("/notifications").header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.unreadCount").value(1))
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].type").value("PRACTICE_RECORDED"))
            .andExpect(jsonPath("$.items[0].title").value("Nova prática registrada"))
            .andExpect(jsonPath("$.items[0].body").value("NotifyAna praticou 30 min (" + today.format(DateTimeFormatter.ofPattern("dd/MM")) + ")"))
            .andExpect(jsonPath("$.items[0].studentId").value(studentId))
            .andExpect(jsonPath("$.items[0].practiceId").value(practiceId))
            .andExpect(jsonPath("$.items[0].read").value(false))
            .andExpect(jsonPath("$.items[0].createdAt").value(endsWith("Z")))
            .andExpect(jsonPath("$.items[0].userId").doesNotHaveJsonPath());
        assertCount(otherToken, 0);
        assertCount(closedToken, 0);
        assertCount(studentToken, 0);
    }

    @Test
    void goalNotifiesOnlyWhenTransitioningFromActiveToCompleted() throws Exception {
        String goal = postId(studentToken, "/me/goals", """
            {"title":"Escalas","type":"OTHER","target":10}
            """);
        updateGoal(goal, 9);
        assertCount(teacherToken, 0);
        updateGoal(goal, 10);
        updateGoal(goal, 12);
        updateGoal(goal, 1);
        updateGoal(goal, 10);
        mvc.perform(get("/notifications").header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].type").value("GOAL_COMPLETED"))
            .andExpect(jsonPath("$.items[0].title").value("Meta concluída"))
            .andExpect(jsonPath("$.items[0].body").value("NotifyAna concluiu a meta \"Escalas\""))
            .andExpect(jsonPath("$.items[0].studentId").value(studentId));
        assertCount(otherToken, 0);
        assertCount(closedToken, 0);
    }

    @Test
    void jobsSummarizeScheduledLessonsAndFindMissingAttendanceWithinSevenDaysWithoutDuplicates() throws Exception {
        String later = lesson(teacherToken, enrollment, today, "10:00", "11:00");
        String first = lesson(teacherToken, enrollment, today, "08:00", "09:00");
        jdbc.update("UPDATE lesson SET status = 'SCHEDULED' WHERE id IN (?, ?)", UUID.fromString(later), UUID.fromString(first));
        lesson(teacherToken, enrollment, today, "12:00", "13:00");
        String canceledToday = lesson(teacherToken, enrollment, today, "14:00", "15:00");
        jdbc.update("UPDATE lesson SET status = 'CANCELED' WHERE id = ?", UUID.fromString(canceledToday));
        String yesterday = lesson(teacherToken, enrollment, today.minusDays(1), "09:00", "10:00");
        String boundary = lesson(teacherToken, enrollment, today.minusDays(7), "09:00", "10:00");
        lesson(teacherToken, enrollment, today.minusDays(8), "09:00", "10:00");
        lesson(teacherToken, enrollment, today.plusDays(1), "09:00", "10:00");
        String canceled = lesson(teacherToken, enrollment, today.minusDays(2), "09:00", "10:00");
        jdbc.update("UPDATE lesson SET status = 'CANCELED' WHERE id = ?", UUID.fromString(canceled));
        for (String outcome : new String[]{"PRESENT", "ABSENT", "EXCUSED"}) {
            String attended = lesson(teacherToken, enrollment, today.minusDays(3),
                outcome.equals("PRESENT") ? "09:00" : outcome.equals("ABSENT") ? "11:00" : "13:00",
                outcome.equals("PRESENT") ? "10:00" : outcome.equals("ABSENT") ? "12:00" : "14:00");
            mvc.perform(post("/teacher/lessons/" + attended + "/attendance").header("Authorization", "Bearer " + teacherToken)
                .contentType("application/json").content("{\"status\":\"" + outcome + "\"}"))
                .andExpect(status().isOk());
        }
        jobs.runFor(today);
        jobs.runFor(today);
        assertCount(teacherToken, 3);
        mvc.perform(get("/notifications").header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(3))
            .andExpect(jsonPath("$.items[?(@.type == 'LESSONS_TODAY')].body")
                .value("Você tem 2 aulas hoje. Primeira às 08:00 com NotifyAna."))
            .andExpect(jsonPath("$.items[?(@.lessonId == '" + yesterday + "')].title").value("Presença pendente"))
            .andExpect(jsonPath("$.items[?(@.lessonId == '" + boundary + "')].body").value(hasItem(containsString("está sem presença e conta como falta."))));
        assertCount(otherToken, 0);
        assertThat(context.getBeansOfType(NotificationSchedulingConfiguration.class)).isEmpty();
    }

    @Test
    void jobsDeleteNotificationsOlderThanNinetyDaysAndPreserveTheBoundary() {
        insertNotification("old", today.minusDays(91));
        UUID boundary = insertNotification("boundary", today.minusDays(90));
        jobs.runFor(today);
        assertThat(jdbc.queryForList("SELECT id FROM notification WHERE user_id = ?", UUID.class, teacherUserId))
            .containsExactly(boundary);
    }

    @Test
    void listingLimitsItemsButCountsAllUnreadAndReadingIsIdempotentAndIsolated() throws Exception {
        registerPractice();
        UUID older = insertNotification("older", today.minusDays(1));
        String body = mvc.perform(get("/notifications?limit=1").header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.unreadCount").value(2))
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].type").value("PRACTICE_RECORDED"))
            .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.items[0].id");
        for (String unreadable : new String[]{id, UUID.randomUUID().toString()}) {
            mvc.perform(patch("/notifications/" + unreadable + "/read").header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
        }
        for (int i = 0; i < 2; i++) mvc.perform(patch("/notifications/" + id + "/read")
            .header("Authorization", "Bearer " + teacherToken)).andExpect(status().isNoContent());
        assertCount(teacherToken, 1);
        mvc.perform(get("/notifications").header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].read").value(true))
            .andExpect(jsonPath("$.items[1].id").value(older.toString()));
        mvc.perform(post("/notifications/read-all").header("Authorization", "Bearer " + otherToken))
            .andExpect(status().isNoContent());
        assertCount(teacherToken, 1);
        mvc.perform(post("/notifications/read-all").header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isNoContent());
        assertCount(teacherToken, 0);
        mvc.perform(get("/notifications").header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[1].read").value(true));
    }

    @Test
    void validatesLimitsAndDefaultsToFifty() throws Exception {
        for (int i = 0; i < 51; i++) insertNotification("item-" + i, today);
        mvc.perform(get("/notifications").header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(50))
            .andExpect(jsonPath("$.unreadCount").value(51));
        mvc.perform(get("/notifications?limit=100").header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(51));
        for (int limit : new int[]{0, 101}) mvc.perform(get("/notifications?limit=" + limit)
            .header("Authorization", "Bearer " + teacherToken)).andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("VALIDATION"));
    }

    @Test
    void allEndpointsRequireAuthentication() throws Exception {
        mvc.perform(get("/notifications")).andExpect(status().isUnauthorized());
        mvc.perform(get("/notifications/unread-count")).andExpect(status().isUnauthorized());
        mvc.perform(patch("/notifications/" + UUID.randomUUID() + "/read")).andExpect(status().isUnauthorized());
        mvc.perform(post("/notifications/read-all")).andExpect(status().isUnauthorized());
    }

    private String registerPractice() throws Exception {
        String body = mvc.perform(post("/me/practices").header("Authorization", "Bearer " + studentToken)
            .contentType("application/json").content("""
                {"durationMin":30,"date":"%s"}
                """.formatted(today)))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.practiceId");
    }

    private void updateGoal(String id, int progress) throws Exception {
        mvc.perform(put("/me/goals/" + id).param("progress", String.valueOf(progress))
            .header("Authorization", "Bearer " + studentToken)).andExpect(status().isOk());
    }

    private void assertCount(String token, int count) throws Exception {
        mvc.perform(get("/notifications/unread-count").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.unreadCount").value(count));
    }

    private UUID insertNotification(String title, LocalDate created) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
            INSERT INTO notification (id, user_id, type, title, body, created_at)
            VALUES (?, ?, 'GOAL_COMPLETED', ?, 'body', ?)
            """, id, teacherUserId, title, created.atStartOfDay());
        return id;
    }
}
