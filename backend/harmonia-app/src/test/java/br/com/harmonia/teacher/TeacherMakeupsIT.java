package br.com.harmonia.teacher;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class TeacherMakeupsIT extends MoreMenuITSupport {
    private String token;
    private String otherToken;
    private String enrollment;
    private String otherEnrollment;

    @BeforeEach
    void setUp() throws Exception {
        String instrument = instrument();
        String a = teacher("makeupA", instrument);
        String b = teacher("makeupB", instrument);
        enrollment = enroll(student("MakeupAna"), a, instrument, "null");
        otherEnrollment = enroll(student("MakeupBia"), b, instrument, "null");
        token = login("makeupA" + suffix, "Teach@1234");
        otherToken = login("makeupB" + suffix, "Teach@1234");
    }

    @Test
    void defaultsIncludeFutureLessonsAndOnlyOwnMakeupsOrderedByNewDate() throws Exception {
        String future = makeup(token, enrollment, today.minusDays(100), today.plusDays(60), "09:00", "10:00");
        String past = makeup(token, enrollment, today.minusDays(90), today.minusDays(30), "09:00", "10:00");
        makeup(token, enrollment, today.minusDays(80), today.plusDays(61), "09:00", "10:00");
        makeup(token, enrollment, today.minusDays(70), today.minusDays(31), "09:00", "10:00");
        makeup(otherToken, otherEnrollment, today.minusDays(60), today.plusDays(1), "11:00", "12:00");
        mvc.perform(get("/teacher/makeups").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].id").value(past)).andExpect(jsonPath("$[1].id").value(future))
            .andExpect(jsonPath("$[1].studentName").value("MakeupAna"))
            .andExpect(jsonPath("$[1].instrument").value("Piano-" + suffix))
            .andExpect(jsonPath("$[1].original.date").value(today.minusDays(100).toString()))
            .andExpect(jsonPath("$[1].makeup.date").value(today.plusDays(60).toString()))
            .andExpect(jsonPath("$[1].makeup.endTime").value("10:00:00"))
            .andExpect(jsonPath("$[1].reason").value("Reposição"));
    }

    @Test
    void filtersInclusivelyByNewLessonDateAndAllowsEntirelyFutureRange() throws Exception {
        String id = makeup(token, enrollment, today.minusDays(5), today.plusDays(4), "09:00", "10:00");
        makeup(token, enrollment, today.minusDays(4), today.plusDays(5), "09:00", "10:00");
        mvc.perform(get("/teacher/makeups").param("from", today.plusDays(4).toString())
            .param("to", today.plusDays(4).toString()).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].id").value(id));
    }

    @Test
    void rejectsReversedAndOversizedRangesAndAccepts366Days() throws Exception {
        for (String query : new String[]{"?from=" + today + "&to=" + today.minusDays(1),
            "?from=" + today.minusDays(366) + "&to=" + today}) {
            mvc.perform(get("/teacher/makeups" + query).header("Authorization", "Bearer " + token))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("DOMAIN_VALIDATION"));
        }
        mvc.perform(get("/teacher/makeups?from=" + today.minusDays(365) + "&to=" + today)
            .header("Authorization", "Bearer " + token)).andExpect(status().isOk());
    }

    @Test
    void requiresPermissionAuthenticationAndTeacherProfile() throws Exception {
        String student = login("MakeupAna" + suffix, "Student@123");
        mvc.perform(get("/teacher/makeups").header("Authorization", "Bearer " + student))
            .andExpect(status().isForbidden());
        mvc.perform(get("/teacher/makeups").header("Authorization", "Bearer " + admin))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("PROFILE_REQUIRED"));
        mvc.perform(get("/teacher/makeups")).andExpect(status().isUnauthorized());
    }

    private String makeup(String token, String enrollment, LocalDate original, LocalDate replacement,
                          String start, String end) throws Exception {
        String lesson = lesson(token, enrollment, original, start, end);
        return postId(token, "/teacher/lessons/" + lesson + "/makeup", """
            {"date":"%s","startTime":"%s","endTime":"%s","reason":"Reposição"}
            """.formatted(replacement, start, end));
    }
}
