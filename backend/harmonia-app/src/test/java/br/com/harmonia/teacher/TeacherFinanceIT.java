package br.com.harmonia.teacher;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class TeacherFinanceIT extends MoreMenuITSupport {
    private String token;
    private String feeEnrollment;
    private String freeEnrollment;
    private String studentToken;
    private String instrument;
    private String teacher;

    @BeforeEach
    void setUp() throws Exception {
        instrument = instrument();
        teacher = teacher("financeA", instrument);
        String otherTeacher = teacher("financeB", instrument);
        String ana = student("Ana");
        String bia = student("Bia");
        feeEnrollment = enroll(ana, teacher, instrument, "150.50");
        freeEnrollment = enroll(bia, teacher, instrument, "null");
        enroll(student("Caio"), teacher, instrument, "0");
        String closed = enroll(student("Closed"), teacher, instrument, "999");
        jdbc.update("UPDATE enrollment SET status = 'CLOSED' WHERE id = ?", UUID.fromString(closed));
        enroll(ana, otherTeacher, instrument, "500");
        token = login("financeA" + suffix, "Teach@1234");
        studentToken = login("Ana" + suffix, "Student@123");
    }

    @Test
    void listsOnlyOwnActiveEnrollmentsSortedByStudentAndSumsDefinedFees() throws Exception {
        mvc.perform(get("/teacher/finance").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.monthlyTotal").value(150.50))
            .andExpect(jsonPath("$.withoutFee").value(1)).andExpect(jsonPath("$.items.length()").value(3))
            .andExpect(jsonPath("$.items[0].enrollmentId").value(feeEnrollment))
            .andExpect(jsonPath("$.items[0].studentName").value("Ana"))
            .andExpect(jsonPath("$.items[0].classLabel").value("Piano-" + suffix))
            .andExpect(jsonPath("$.items[1].monthlyFee").value(nullValue()))
            .andExpect(jsonPath("$.items[2].monthlyFee").value(0));
    }

    @Test
    void rejectsStudentAndRequiresTeacherProfileForAdmin() throws Exception {
        mvc.perform(get("/teacher/finance").header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isForbidden());
        mvc.perform(get("/teacher/finance").header("Authorization", "Bearer " + admin))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("PROFILE_REQUIRED"));
        mvc.perform(get("/teacher/finance")).andExpect(status().isUnauthorized());
    }

    @Test
    void adminDefinesAndClearsFeeWhileTeacherCannotWrite() throws Exception {
        mvc.perform(put("/admin/enrollments/" + freeEnrollment + "/fee").header("Authorization", "Bearer " + admin)
            .contentType("application/json").content("{\"monthlyFee\":200.25}"))
            .andExpect(status().isNoContent());
        mvc.perform(get("/teacher/finance").header("Authorization", "Bearer " + token))
            .andExpect(jsonPath("$.monthlyTotal").value(350.75)).andExpect(jsonPath("$.withoutFee").value(0));
        mvc.perform(put("/admin/enrollments/" + feeEnrollment + "/fee").header("Authorization", "Bearer " + admin)
            .contentType("application/json").content("{\"monthlyFee\":null}"))
            .andExpect(status().isNoContent());
        mvc.perform(get("/teacher/finance").header("Authorization", "Bearer " + token))
            .andExpect(jsonPath("$.monthlyTotal").value(200.25)).andExpect(jsonPath("$.withoutFee").value(1));
        mvc.perform(put("/admin/enrollments/" + feeEnrollment + "/fee").header("Authorization", "Bearer " + token)
            .contentType("application/json").content("{\"monthlyFee\":100}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void rejectsNegativeExcessPrecisionAndOverflowOnCreationAndUpdate() throws Exception {
        String student = student("InvalidFee");
        for (String fee : new String[]{"-1", "1.001", "100000000"}) {
            mvc.perform(put("/admin/enrollments/" + feeEnrollment + "/fee").header("Authorization", "Bearer " + admin)
                .contentType("application/json").content("{\"monthlyFee\":" + fee + "}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION"));
            mvc.perform(post("/admin/enrollments").header("Authorization", "Bearer " + admin)
                .contentType("application/json").content("""
                    {"studentId":"%s","teacherId":"%s","instrumentId":"%s","monthlyFee":%s}
                    """.formatted(student, teacher, instrument, fee)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION"));
        }
    }

    @Test
    void unknownEnrollmentReturns404AndCreationStillAcceptsOmittedFee() throws Exception {
        mvc.perform(put("/admin/enrollments/" + UUID.randomUUID() + "/fee").header("Authorization", "Bearer " + admin)
            .contentType("application/json").content("{\"monthlyFee\":null}"))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
        postId(admin, "/admin/enrollments", """
            {"studentId":"%s","teacherId":"%s","instrumentId":"%s"}
            """.formatted(student("NoFee"), teacher, instrument));
        mvc.perform(get("/teacher/finance").header("Authorization", "Bearer " + token))
            .andExpect(jsonPath("$.withoutFee").value(2));
    }

    @Test
    void returnsZeroForTeacherWithoutEnrollments() throws Exception {
        teacher("emptyFinance", instrument);
        String empty = login("emptyFinance" + suffix, "Teach@1234");
        mvc.perform(get("/teacher/finance").header("Authorization", "Bearer " + empty))
            .andExpect(status().isOk()).andExpect(jsonPath("$.monthlyTotal").value(0))
            .andExpect(jsonPath("$.withoutFee").value(0)).andExpect(jsonPath("$.items").isEmpty());
    }
}
