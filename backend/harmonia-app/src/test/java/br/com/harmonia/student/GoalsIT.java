package br.com.harmonia.student;

import br.com.harmonia.teacher.MoreMenuITSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class GoalsIT extends MoreMenuITSupport {
    private String teacherToken;
    private String otherToken;
    private String studentToken;
    private String studentId;
    private String enrollment;

    @BeforeEach
    void setUp() throws Exception {
        String instrument = instrument();
        String teacherId = teacher("goalT", instrument);
        teacher("goalOther", instrument);
        studentId = student("GoalBia");
        enrollment = enroll(studentId, teacherId, instrument, "null");
        teacherToken = login("goalT" + suffix, "Teach@1234");
        otherToken = login("goalOther" + suffix, "Teach@1234");
        studentToken = login("GoalBia" + suffix, "Student@123");
    }

    @Test
    void weeklyPracticeGoalFollowsRegisteredPractices() throws Exception {
        String goal = postId(studentToken, "/me/goals", """
            {"title":"3 h por semana","type":"PRACTICE_TIME","period":"WEEKLY","target":180}
            """);
        practice(50);
        practice(40);

        mvc.perform(get("/me/goals?status=ACTIVE").header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].id", is(goal)))
            .andExpect(jsonPath("$[0].period", is("WEEKLY")))
            .andExpect(jsonPath("$[0].currentProgress", is(90)))
            .andExpect(jsonPath("$[0].achieved", is(false)))
            .andExpect(jsonPath("$[0].legacy", is(false)))
            .andExpect(jsonPath("$[0].canEnd", is(true)))
            .andExpect(jsonPath("$[0].createdByTeacher", nullValue()))
            .andExpect(jsonPath("$[0].periodStart", is(today.with(DayOfWeek.MONDAY).toString())))
            .andExpect(jsonPath("$[0].student").doesNotHaveJsonPath());

        mvc.perform(patch("/me/goals/" + goal + "/end").header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status", is("ENDED")))
            .andExpect(jsonPath("$.currentProgress", is(90)));
        mvc.perform(get("/me/goals?status=ENDED").header("Authorization", "Bearer " + studentToken))
            .andExpect(jsonPath("$[0].id", is(goal))).andExpect(jsonPath("$[0].canEnd", is(false)))
            .andExpect(jsonPath("$[0].currentProgress", is(90)))
            .andExpect(jsonPath("$[0].periodStart", is(today.with(DayOfWeek.MONDAY).toString())));
        mvc.perform(get("/me/goals?status=ACTIVE").header("Authorization", "Bearer " + studentToken))
            .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void attendanceGoalCountsPresentLessons() throws Exception {
        postId(studentToken, "/me/goals", """
            {"title":"Ir à aula","type":"ATTENDANCE","period":"DAILY","target":1}
            """);
        String lesson = lesson(teacherToken, enrollment, today, "00:00", "00:30");
        mvc.perform(post("/teacher/lessons/" + lesson + "/attendance").header("Authorization", "Bearer " + teacherToken)
                .contentType("application/json").content("{\"status\":\"PRESENT\"}"))
            .andExpect(status().isOk());

        mvc.perform(get("/me/goals").header("Authorization", "Bearer " + studentToken))
            .andExpect(jsonPath("$[0].currentProgress", is(1)))
            .andExpect(jsonPath("$[0].achieved", is(true)))
            .andExpect(jsonPath("$[0].streak", is(1)));
        mvc.perform(get("/notifications").header("Authorization", "Bearer " + teacherToken))
            .andExpect(jsonPath("$.items[?(@.type == 'GOAL_COMPLETED')]", hasSize(1)));
    }

    @Test
    void teacherSetsGoalsOnlyForLinkedStudentsAndStudentCannotEndThem() throws Exception {
        String body = """
            {"title":"5 dias","type":"PRACTICE_DAYS","period":"WEEKLY","target":5}
            """;
        mvc.perform(post("/teacher/students/" + studentId + "/goals").header("Authorization", "Bearer " + otherToken)
                .contentType("application/json").content(body))
            .andExpect(status().isForbidden());
        String goal = postId(teacherToken, "/teacher/students/" + studentId + "/goals", body);
        jdbc.update("UPDATE enrollment SET status = 'CLOSED' WHERE id = ?", UUID.fromString(enrollment));
        mvc.perform(post("/teacher/students/" + studentId + "/goals").header("Authorization", "Bearer " + teacherToken)
                .contentType("application/json").content(body))
            .andExpect(status().isForbidden());
        mvc.perform(patch("/teacher/students/" + studentId + "/goals/" + goal + "/end")
                .header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isForbidden());
        jdbc.update("UPDATE enrollment SET status = 'ACTIVE' WHERE id = ?", UUID.fromString(enrollment));

        mvc.perform(get("/me/goals").header("Authorization", "Bearer " + studentToken))
            .andExpect(jsonPath("$[0].createdByTeacher", is("goalT")))
            .andExpect(jsonPath("$[0].canEnd", is(false)));
        mvc.perform(patch("/me/goals/" + goal + "/end").header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isForbidden());
        mvc.perform(get("/teacher/students/" + studentId + "/goals?status=ACTIVE")
                .header("Authorization", "Bearer " + teacherToken))
            .andExpect(jsonPath("$[0].canEnd", is(true)));
        mvc.perform(patch("/teacher/students/" + studentId + "/goals/" + goal + "/end")
                .header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status", is("ENDED")));
    }

    @Test
    void rejectsLegacyTypesMissingPeriodAndImpossibleDayTargets() throws Exception {
        for (String body : new String[]{
            "{\"title\":\"x\",\"type\":\"OTHER\",\"period\":\"WEEKLY\",\"target\":1}",
            "{\"title\":\"x\",\"type\":\"PRACTICE_DAYS\",\"period\":\"WEEKLY\",\"target\":8}"}) {
            mvc.perform(post("/me/goals").header("Authorization", "Bearer " + studentToken)
                    .contentType("application/json").content(body))
                .andExpect(status().isUnprocessableEntity());
        }
        mvc.perform(post("/me/goals").header("Authorization", "Bearer " + studentToken)
                .contentType("application/json").content("{\"title\":\"x\",\"type\":\"PRACTICE_TIME\",\"target\":30}"))
            .andExpect(status().is4xxClientError());
    }

    @Test
    void legacyGoalsStayReadOnly() throws Exception {
        UUID legacy = UUID.randomUUID();
        jdbc.update("""
            INSERT INTO goal (id, student_id, title, type, target, current_progress, status)
            VALUES (?, ?, 'Antiga', 'OTHER', 10, 4, 'ACTIVE')
            """, legacy, UUID.fromString(studentId));

        mvc.perform(get("/me/goals?status=ACTIVE").header("Authorization", "Bearer " + studentToken))
            .andExpect(jsonPath("$[0].legacy", is(true)))
            .andExpect(jsonPath("$[0].currentProgress", is(4)))
            .andExpect(jsonPath("$[0].period", nullValue()));
    }

    private void practice(int minutes) throws Exception {
        mvc.perform(post("/me/practices").header("Authorization", "Bearer " + studentToken)
                .contentType("application/json").content("""
                    {"durationMin":%d,"date":"%s"}
                    """.formatted(minutes, today)))
            .andExpect(status().isOk());
    }
}
