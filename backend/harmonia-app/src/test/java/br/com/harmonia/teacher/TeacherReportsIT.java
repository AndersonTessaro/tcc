package br.com.harmonia.teacher;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.UUID;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class TeacherReportsIT {

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;

    private final LocalDate today = LocalDate.now();
    private String suffix;
    private String admin;
    private String teacherA;
    private String teacherB;
    private String studentS;
    private String studentU;
    private String studentT;
    private String enrollmentSA;
    private String enrollmentSB;

    @BeforeEach
    void setUp() throws Exception {
        suffix = UUID.randomUUID().toString().substring(0, 8);
        admin = login("admin", "Admin@123");
        String alpha = postId(admin, "/admin/instruments", "{\"name\":\"Alpha-" + suffix + "\"}");
        String beta = postId(admin, "/admin/instruments", "{\"name\":\"Beta-" + suffix + "\"}");
        String a = createTeacher("repA", alpha, beta);
        String b = createTeacher("repB", alpha);
        studentS = createStudent("repS", "Ana Report");
        studentU = createStudent("repU", "Bia Report");
        studentT = createStudent("repT", "Caio Report");
        enrollmentSA = enroll(studentS, a, alpha);
        enrollmentSB = enroll(studentS, b, alpha);
        enroll(studentU, a, beta);
        jdbc.update("UPDATE enrollment SET status = 'CLOSED' WHERE id = ?", UUID.fromString(enroll(studentT, a, alpha)));
        teacherA = login("repA" + suffix, "Teach@1234");
        teacherB = login("repB" + suffix, "Teach@1234");
    }

    @Test
    void attendance_appliesRn09AndExcludesCanceledAndOtherTeachers() throws Exception {
        attend(teacherA, lesson(teacherA, enrollmentSA, today.minusDays(3), "09:00"), "PRESENT");
        attend(teacherA, lesson(teacherA, enrollmentSA, today.minusDays(4), "09:00"), "EXCUSED");
        lesson(teacherA, enrollmentSA, today.minusDays(5), "09:00");
        String canceled = lesson(teacherA, enrollmentSA, today.minusDays(6), "09:00");
        jdbc.update("UPDATE lesson SET status = 'CANCELED' WHERE id = ?", UUID.fromString(canceled));
        lesson(teacherA, enrollmentSA, today, "09:00");
        attend(teacherB, lesson(teacherB, enrollmentSB, today.minusDays(3), "14:00"), "ABSENT");

        mvc.perform(get("/teacher/reports/attendance").header("Authorization", "Bearer " + teacherA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.to").value(today.toString()))
            .andExpect(jsonPath("$.totals.due").value(3))
            .andExpect(jsonPath("$.totals.absent").value(0))
            .andExpect(jsonPath("$.students.length()").value(2))
            .andExpect(jsonPath("$.students[0].studentId").value(studentS))
            .andExpect(jsonPath("$.students[0].active").value(true))
            .andExpect(jsonPath("$.students[0].attendance.present").value(1))
            .andExpect(jsonPath("$.students[0].attendance.excused").value(1))
            .andExpect(jsonPath("$.students[0].attendance.unrecorded").value(1))
            .andExpect(jsonPath("$.students[0].attendance.rate").value(33))
            .andExpect(jsonPath("$.students[1].studentId").value(studentU))
            .andExpect(jsonPath("$.students[1].attendance.due").value(0))
            .andExpect(jsonPath("$.students[1].attendance.rate").value(nullValue()));
    }

    @Test
    void practice_aggregatesOnlyActiveLinkedStudents() throws Exception {
        practice(studentS, today.minusDays(2), 30, 4);
        practice(studentS, today.minusDays(1), 20, null);
        practice(studentS, today.minusDays(40), 60, 5);
        practice(studentT, today.minusDays(1), 15, 3);

        mvc.perform(get("/teacher/reports/practice").header("Authorization", "Bearer " + teacherA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totals.totalMinutes").value(50))
            .andExpect(jsonPath("$.totals.sessions").value(2))
            .andExpect(jsonPath("$.totals.practicingStudents").value(1))
            .andExpect(jsonPath("$.totals.linkedStudents").value(2))
            .andExpect(jsonPath("$.totals.avgRating").value(4.0))
            .andExpect(jsonPath("$.students[0].studentId").value(studentU))
            .andExpect(jsonPath("$.students[0].minutes").value(0))
            .andExpect(jsonPath("$.students[1].studentId").value(studentS))
            .andExpect(jsonPath("$.students[1].practiceDays").value(2))
            .andExpect(jsonPath("$.students[1].lastPractice").value(today.minusDays(1).toString()))
            .andExpect(jsonPath("$.weeks.length()").value(greaterThanOrEqualTo(5)));
    }

    @Test
    void classes_groupsByInstrumentWithoutClassGroup() throws Exception {
        attend(teacherA, lesson(teacherA, enrollmentSA, today.minusDays(3), "09:00"), "PRESENT");
        practice(studentS, today.minusDays(2), 30, 4);

        mvc.perform(get("/teacher/reports/classes").header("Authorization", "Bearer " + teacherA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.groups.length()").value(2))
            .andExpect(jsonPath("$.groups[0].name").value("Alpha-" + suffix))
            .andExpect(jsonPath("$.groups[0].students").value(1))
            .andExpect(jsonPath("$.groups[0].attendance.rate").value(100))
            .andExpect(jsonPath("$.groups[0].practiceMinutes").value(30))
            .andExpect(jsonPath("$.groups[0].avgRating").value(4.0))
            .andExpect(jsonPath("$.groups[1].name").value("Beta-" + suffix))
            .andExpect(jsonPath("$.groups[1].attendance.rate").value(nullValue()));
    }

    @Test
    void reports_rejectInvalidPeriod() throws Exception {
        mvc.perform(get("/teacher/reports/attendance?from=" + today + "&to=" + today.minusDays(1))
                .header("Authorization", "Bearer " + teacherA))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("DOMAIN_VALIDATION"));
    }

    @Test
    void reports_forbiddenForStudentAndAdminWithoutTeacherProfile() throws Exception {
        String student = login("repS" + suffix, "Student@123");
        mvc.perform(get("/teacher/reports/practice").header("Authorization", "Bearer " + student))
            .andExpect(status().isForbidden());
        mvc.perform(get("/teacher/reports/classes").header("Authorization", "Bearer " + admin))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("PROFILE_REQUIRED"));
    }

    private String createTeacher(String name, String... instruments) throws Exception {
        String ids = String.join("\",\"", instruments);
        return postId(admin, "/admin/teachers", "{\"username\":\"" + name + suffix + "\",\"email\":\"" + name + suffix
            + "@h.local\",\"password\":\"Teach@1234\",\"name\":\"" + name + "\",\"instrumentIds\":[\"" + ids + "\"]}");
    }

    private String createStudent(String name, String displayName) throws Exception {
        return postId(admin, "/admin/students", "{\"username\":\"" + name + suffix + "\",\"email\":\"" + name + suffix
            + "@h.local\",\"password\":\"Student@123\",\"name\":\"" + displayName + "\"}");
    }

    private String enroll(String student, String teacher, String instrument) throws Exception {
        return postId(admin, "/admin/enrollments", "{\"studentId\":\"" + student + "\",\"teacherId\":\"" + teacher
            + "\",\"instrumentId\":\"" + instrument + "\"}");
    }

    private String lesson(String token, String enrollment, LocalDate date, String start) throws Exception {
        String end = String.format("%02d:00", Integer.parseInt(start.substring(0, 2)) + 1);
        return postId(token, "/teacher/lessons", "{\"enrollmentId\":\"" + enrollment + "\",\"date\":\"" + date
            + "\",\"startTime\":\"" + start + "\",\"endTime\":\"" + end + "\"}");
    }

    private void attend(String token, String lessonId, String outcome) throws Exception {
        mvc.perform(post("/teacher/lessons/" + lessonId + "/attendance").header("Authorization", "Bearer " + token)
                .contentType("application/json").content("{\"status\":\"" + outcome + "\"}"))
            .andExpect(status().isOk());
    }

    private void practice(String student, LocalDate date, int minutes, Integer rating) {
        jdbc.update("INSERT INTO practice (student_id, date, duration_min, rating) VALUES (?, ?, ?, ?)",
            UUID.fromString(student), date, minutes, rating);
    }

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
}
