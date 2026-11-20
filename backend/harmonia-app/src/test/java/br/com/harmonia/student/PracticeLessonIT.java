package br.com.harmonia.student;

import br.com.harmonia.teacher.MoreMenuITSupport;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PracticeLessonIT extends MoreMenuITSupport {
    private String studentToken, teacherToken, studentId, lessonId, otherLessonId, instrument;

    @BeforeEach
    void setUp() throws Exception {
        instrument = instrument();
        String teacher = teacher("practiceLessonTeacher", instrument);
        studentId = student("practiceLessonStudent");
        String other = student("practiceLessonOther");
        teacherToken = login("practiceLessonTeacher" + suffix, "Teach@1234");
        studentToken = login("practiceLessonStudent" + suffix, "Student@123");
        lessonId = lesson(teacherToken, enroll(studentId, teacher, instrument, "null"), today.plusDays(2), "09:00:00", "10:00:00");
        otherLessonId = lesson(teacherToken, enroll(other, teacher, instrument, "null"), today.plusDays(3), "09:00:00", "10:00:00");
    }

    private org.springframework.test.web.servlet.ResultActions register(String lesson) throws Exception {
        return mvc.perform(post("/me/practices").header("Authorization", "Bearer " + studentToken)
            .contentType("application/json").content("{\"durationMin\":20,\"lessonId\":\"" + lesson + "\"}"));
    }

    @Test
    void practiceAnswersALessonAndBothSidesSeeTheLink() throws Exception {
        String practiceId = JsonPath.read(register(lessonId).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString(), "$.practiceId");

        mvc.perform(get("/me/practices").header("Authorization", "Bearer " + studentToken))
            .andExpect(jsonPath("$[0].id").value(practiceId))
            .andExpect(jsonPath("$[0].lessonId").value(lessonId));
        mvc.perform(get("/teacher/students/" + studentId + "/practices").header("Authorization", "Bearer " + teacherToken))
            .andExpect(jsonPath("$[0].lessonId").value(lessonId));
        String instrumentOf = jdbc.queryForObject("select instrument_id::text from practice where id = ?::uuid", String.class, practiceId);
        org.assertj.core.api.Assertions.assertThat(instrumentOf).isEqualTo(instrument);
    }

    @Test
    void anotherStudentsLessonIsNotFound() throws Exception {
        register(otherLessonId).andExpect(status().isNotFound());
        register("00000000-0000-0000-0000-000000000000").andExpect(status().isNotFound());
    }

    @Test
    void aCanceledLessonCannotBeAnswered() throws Exception {
        mvc.perform(patch("/teacher/lessons/" + lessonId + "/status").header("Authorization", "Bearer " + teacherToken)
            .contentType("application/json").content("{\"status\":\"CANCELED\"}")).andExpect(status().isOk());

        register(lessonId).andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("DOMAIN_VALIDATION"));
    }
}
