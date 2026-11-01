package br.com.harmonia.admin;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class SchoolManagementIT {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManager entityManager;
    private String admin, manager, managerUserId, schoolA, schoolB, teacherA, teacherB, studentA, studentB;
    private String enrollmentA, enrollmentB, userB, instrument, lessonB, teacherLogin, suffix;
    private final LocalDate tomorrow = LocalDate.now().plusDays(1);

    @BeforeEach
    void setUpSchools() throws Exception {
        suffix = UUID.randomUUID().toString().substring(0, 8);
        admin = login("admin", "Admin@123");
        schoolA = create(admin, "/admin/schools", "{\"name\":\"School A " + suffix + "\"}");
        schoolB = create(admin, "/admin/schools", "{\"name\":\"School B " + suffix + "\"}");
        managerUserId = create(admin, "/admin/schools/" + schoolA + "/managers", person("manager", schoolB));
        manager = login("manager" + suffix, "School@123");
        instrument = create(admin, "/admin/instruments", "{\"name\":\"Piano " + suffix + "\"}");
        teacherA = create(admin, "/admin/teachers", person("teacherA", schoolA));
        teacherB = create(admin, "/admin/teachers", person("teacherB", schoolB));
        for (String teacher : List.of(teacherA, teacherB)) {
            call("PUT", "/admin/teachers/" + teacher + "/instruments", admin,
                "{\"instrumentIds\":[\"" + instrument + "\"]}").andExpect(status().isOk());
        }
        studentA = create(admin, "/admin/students", person("studentA", schoolA));
        studentB = create(admin, "/admin/students", person("studentB", schoolB));
        enrollmentA = create(admin, "/admin/enrollments", enrollment(studentA, teacherA));
        enrollmentB = create(admin, "/admin/enrollments", enrollment(studentB, teacherB));
        userB = jdbc.queryForObject("select user_id from student where id = ?", UUID.class, UUID.fromString(studentB)).toString();
        lessonB = create(admin, "/teacher/lessons", lesson(enrollmentB));
        teacherLogin = "teacherA" + suffix;
    }

    private ResultActions call(String method, String path, String token, String body) throws Exception {
        var builder = request(HttpMethod.valueOf(method), path).contentType("application/json");
        if (token != null) builder.header("Authorization", "Bearer " + token);
        if (body != null) builder.content(body);
        return mvc.perform(builder);
    }

    private String create(String token, String path, String body) throws Exception {
        String response = call("POST", path, token, body).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.id").toString();
    }

    private String login(String name, String password) throws Exception {
        String response = call("POST", "/auth/login", null,
            "{\"login\":\"" + name + "\",\"password\":\"" + password + "\"}")
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.accessToken");
    }

    private String person(String name, String school) {
        return "{\"username\":\"%s%s\",\"email\":\"%s%s@test.local\",\"password\":\"School@123\",\"name\":\"%s\"%s}"
            .formatted(name, suffix, name, suffix, name, school == null ? "" : ",\"schoolId\":\"" + school + "\"");
    }

    private String enrollment(String student, String teacher) {
        return "{\"studentId\":\"%s\",\"teacherId\":\"%s\",\"instrumentId\":\"%s\"}"
            .formatted(student, teacher, instrument);
    }

    private String lesson(String enrollment) {
        return "{\"enrollmentId\":\"%s\",\"date\":\"%s\",\"startTime\":\"10:00\",\"endTime\":\"11:00\"}"
            .formatted(enrollment, tomorrow);
    }

    private long role(String name) {
        return jdbc.queryForObject("select id from auth_role where name = ?", Long.class, name);
    }

    private void schoolOf(String name, String expected) {
        // JDBC queries do not trigger Hibernate's automatic flush.
        entityManager.flush();
        assertThat(jdbc.queryForObject("select school_id from auth_user where username = ?", UUID.class, name + suffix))
            .isEqualTo(UUID.fromString(expected));
    }

    @Test
    void managerListsOnlyOwnSchoolWhileAdminSeesBoth() throws Exception {
        String ownLesson = create(manager, "/teacher/lessons", lesson(enrollmentA));
        String[][] resources = {{"students", studentA, studentB}, {"teachers", teacherA, teacherB},
            {"enrollments", enrollmentA, enrollmentB}, {"security/users", "", userB},
            {"lessons?from=" + tomorrow + "&to=" + tomorrow, ownLesson, lessonB}};
        for (String[] resource : resources) {
            call("GET", "/admin/" + resource[0], manager, null).andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == '" + resource[2] + "')]").isEmpty());
            call("GET", "/admin/" + resource[0], admin, null).andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == '" + resource[2] + "')]").isNotEmpty());
            if (!resource[1].isEmpty()) call("GET", "/admin/" + resource[0], manager, null)
                .andExpect(jsonPath("$[?(@.id == '" + resource[1] + "')]").isNotEmpty());
        }
        call("GET", "/admin/lessons?teacherId=" + teacherB + "&from=" + tomorrow + "&to=" + tomorrow, manager, null)
            .andExpect(status().isNotFound());
    }

    @ParameterizedTest
    @ValueSource(strings = {"teacherInstruments", "enrollmentStudent", "enrollmentTeacher", "enrollmentStatus", "enrollmentFee",
        "userRoles", "userStatus", "userPassword", "userDelete", "lessonCreate", "lessonRead", "lessonEdit",
        "lessonStatus", "lessonAttendance", "studentProfile", "studentLessons", "finance"})
    void crossSchoolActionsReturnNotFound(String action) throws Exception {
        ResultActions result = switch (action) {
            case "teacherInstruments" -> call("PUT", "/admin/teachers/" + teacherB + "/instruments", manager, "{\"instrumentIds\":[]}");
            case "enrollmentStudent" -> call("POST", "/admin/enrollments", manager, enrollment(studentB, teacherA));
            case "enrollmentTeacher" -> call("POST", "/admin/enrollments", manager, enrollment(studentA, teacherB));
            case "enrollmentStatus" -> call("PUT", "/admin/enrollments/" + enrollmentB + "/status", manager, "{\"status\":\"CLOSED\"}");
            case "enrollmentFee" -> call("PUT", "/admin/enrollments/" + enrollmentB + "/fee", manager, "{\"monthlyFee\":10}");
            case "userRoles" -> call("PUT", "/admin/security/users/" + userB + "/roles", manager, "{\"roleIds\":[" + role("STUDENT") + "]}");
            case "userStatus" -> call("PUT", "/admin/security/users/" + userB + "/status", manager, "{\"active\":false}");
            case "userPassword" -> call("PUT", "/admin/security/users/" + userB + "/password", manager, "{\"newPassword\":\"Changed@123\"}");
            case "userDelete" -> call("DELETE", "/admin/users/" + userB, manager, null);
            case "lessonCreate" -> call("POST", "/teacher/lessons", manager, lesson(enrollmentB));
            case "lessonRead" -> call("GET", "/teacher/lessons/" + lessonB, manager, null);
            case "lessonEdit" -> call("PUT", "/teacher/lessons/" + lessonB, manager, lesson(enrollmentB));
            case "lessonStatus" -> call("PATCH", "/teacher/lessons/" + lessonB + "/status", manager, "{\"status\":\"CANCELED\"}");
            case "lessonAttendance" -> call("POST", "/teacher/lessons/" + lessonB + "/attendance", manager, "{\"status\":\"PRESENT\"}");
            case "studentProfile" -> call("GET", "/teacher/students/" + studentB + "/profile", manager, null);
            case "studentLessons" -> call("GET", "/teacher/students/" + studentB + "/lessons", manager, null);
            case "finance" -> call("POST", "/admin/finance/transactions", manager,
                "{\"type\":\"INCOME\",\"amount\":10,\"studentId\":\"" + studentB + "\"}");
            default -> throw new IllegalArgumentException(action);
        };
        result.andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void managerCreatesAndManagesOwnSchoolResources() throws Exception {
        String teacher = create(manager, "/admin/teachers", person("newTeacher", schoolB));
        String student = create(manager, "/admin/students", person("newStudent", null));
        schoolOf("newTeacher", schoolA);
        schoolOf("newStudent", schoolA);
        assertThat(jdbc.queryForObject("select school_id from auth_user where id = ?", UUID.class, UUID.fromString(managerUserId)))
            .isEqualTo(UUID.fromString(schoolA));
        call("PUT", "/admin/teachers/" + teacher + "/instruments", manager,
            "{\"instrumentIds\":[\"" + instrument + "\"]}").andExpect(status().isOk());
        String enrollment = create(manager, "/admin/enrollments", enrollment(student, teacher));
        call("PUT", "/admin/enrollments/" + enrollment + "/fee", manager, "{\"monthlyFee\":150}")
            .andExpect(status().isNoContent());
        call("PUT", "/admin/enrollments/" + enrollment + "/status", manager, "{\"status\":\"SUSPENDED\"}")
            .andExpect(status().isNoContent());
        String user = jdbc.queryForObject("select user_id from student where id = ?", UUID.class, UUID.fromString(student)).toString();
        call("PUT", "/admin/security/users/" + user + "/roles", manager, "{\"roleIds\":[" + role("STUDENT") + "]}")
            .andExpect(status().isOk());
        call("PUT", "/admin/security/users/" + user + "/password", manager, "{\"newPassword\":\"Changed@123\"}")
            .andExpect(status().isOk());
        assertThat(login("newStudent" + suffix, "Changed@123")).isNotBlank();
        call("PUT", "/admin/security/users/" + user + "/status", manager, "{\"active\":false}")
            .andExpect(status().isOk());
        call("DELETE", "/admin/users/" + user, manager, null).andExpect(status().isNoContent());
    }

    @Test
    void managerUsesExistingLessonRulesAndAttendanceForOwnTeachers() throws Exception {
        String id = create(manager, "/teacher/lessons", lesson(enrollmentA));
        call("POST", "/teacher/lessons", manager, lesson(enrollmentA)).andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("SCHEDULE_CONFLICT"));
        call("PUT", "/teacher/lessons/" + id, manager, lesson(enrollmentA))
            .andExpect(status().isOk());
        call("PATCH", "/teacher/lessons/" + id + "/status", manager, "{\"status\":\"CANCELED\"}")
            .andExpect(status().isOk());
        String past = create(manager, "/teacher/lessons", lesson(enrollmentA).replace(tomorrow.toString(), tomorrow.minusDays(2).toString()));
        call("POST", "/teacher/lessons/" + past + "/attendance", manager, "{\"status\":\"PRESENT\"}")
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PRESENT"));
    }

    @Test
    void financeListsAndBalanceAreScopedAndManagerCannotOverrideSchool() throws Exception {
        String own = create(manager, "/admin/finance/transactions",
            "{\"type\":\"INCOME\",\"amount\":10,\"schoolId\":\"" + schoolB + "\"}");
        String other = create(admin, "/admin/finance/transactions",
            "{\"type\":\"INCOME\",\"amount\":99,\"schoolId\":\"" + schoolB + "\"}");
        call("GET", "/admin/finance/transactions", manager, null).andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == '" + own + "' && @.schoolId == '" + schoolA + "')]").isNotEmpty())
            .andExpect(jsonPath("$[?(@.id == '" + other + "')]").isEmpty());
        call("GET", "/admin/finance/balance", manager, null).andExpect(jsonPath("$.balance").value(10));
        call("GET", "/admin/finance/transactions", admin, null)
            .andExpect(jsonPath("$[?(@.id == '" + other + "')]").isNotEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMIN", "MANAGER"})
    void managerCannotAssignPrivilegedRoles(String name) throws Exception {
        String user = jdbc.queryForObject("select user_id from student where id = ?", UUID.class, UUID.fromString(studentA)).toString();
        call("PUT", "/admin/security/users/" + user + "/roles", manager, "{\"roleIds\":[" + role(name) + "]}")
            .andExpect(status().isForbidden());
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {"POST|/admin/security/roles|{\"name\":\"CUSTOM\",\"description\":\"Custom\"}",
        "GET|/admin/settings|{}", "PUT|/admin/settings/test|{\"value\":\"1\"}",
        "POST|/admin/instruments|{\"name\":\"Global\"}", "GET|/admin/schools|{}",
        "POST|/admin/schools|{\"name\":\"Forbidden\"}"})
    void managerCannotChangeGlobalResources(String method, String path, String body) throws Exception {
        call(method, path, manager, body).andExpect(status().isForbidden());
    }

    @Test
    void managerCannotChangeRolePermissionsOrAssignCustomGlobalPowers() throws Exception {
        long id = role("STUDENT");
        call("PUT", "/admin/security/roles/" + id + "/permissions", manager, "{\"permissionIds\":[]}")
            .andExpect(status().isForbidden());
        String custom = create(admin, "/admin/security/roles", "{\"name\":\"CUSTOM" + suffix + "\",\"description\":\"Custom\"}");
        long permission = jdbc.queryForObject("select id from auth_permission where name = 'school.manage'", Long.class);
        call("PUT", "/admin/security/roles/" + custom + "/permissions", admin, "{\"permissionIds\":[" + permission + "]}")
            .andExpect(status().isOk());
        String user = jdbc.queryForObject("select user_id from student where id = ?", UUID.class, UUID.fromString(studentA)).toString();
        call("PUT", "/admin/security/users/" + user + "/roles", manager, "{\"roleIds\":[" + custom + "]}")
            .andExpect(status().isForbidden());
    }

    @Test
    void customEnrollmentPermissionCannotBypassSchoolOwnership() throws Exception {
        String custom = create(admin, "/admin/security/roles", "{\"name\":\"ENROLL" + suffix + "\",\"description\":\"Enroll\"}");
        long permission = jdbc.queryForObject("select id from auth_permission where name = 'enrollment.manage'", Long.class);
        call("PUT", "/admin/security/roles/" + custom + "/permissions", admin, "{\"permissionIds\":[" + permission + "]}")
            .andExpect(status().isOk());
        for (String username : List.of("studentA", "teacherA")) {
            String user = jdbc.queryForObject("select id from auth_user where username = ?", UUID.class, username + suffix).toString();
            call("PUT", "/admin/security/users/" + user + "/roles", manager, "{\"roleIds\":[" + custom + "]}")
                .andExpect(status().isOk());
            String token = login(username + suffix, "School@123");
            call("POST", "/admin/enrollments", token, enrollment(studentB, teacherB)).andExpect(status().isForbidden());
        }
    }

    @Test
    void schoolsCanBeUpdatedAndManagerCreationRespectsGlobalLoginUniqueness() throws Exception {
        call("PUT", "/admin/schools/" + schoolA, admin, "{\"name\":\"Renamed " + suffix + "\",\"active\":false}")
            .andExpect(status().isOk()).andExpect(jsonPath("$.active").value(false));
        call("POST", "/admin/schools/" + schoolA + "/managers", admin, person("inactive", null))
            .andExpect(status().isUnprocessableEntity());
        call("PUT", "/admin/schools/" + schoolA, admin, "{\"name\":\"Renamed " + suffix + "\",\"active\":true}")
            .andExpect(status().isOk());
        call("POST", "/admin/schools/" + schoolA + "/managers", admin, person("studentB", null))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("DUPLICATE_RESOURCE"));
        String collision = person("collision", null).replace("collision" + suffix + "@test.local", "teacherB" + suffix);
        call("POST", "/admin/schools/" + schoolA + "/managers", admin, collision)
            .andExpect(status().isUnprocessableEntity());
        collision = person("collision", null).replace("collision" + suffix + "\",\"email", "teacherB" + suffix + "@test.local\",\"email");
        call("POST", "/admin/schools/" + schoolA + "/managers", admin, collision)
            .andExpect(status().isConflict());
        call("PUT", "/admin/schools/" + UUID.randomUUID(), admin, "{\"name\":\"Missing\",\"active\":true}")
            .andExpect(status().isNotFound());
    }

    @ParameterizedTest
    @ValueSource(strings = {"students", "teachers"})
    void adminRegistrationRequiresSchool(String kind) throws Exception {
        call("POST", "/admin/" + kind, admin, person("missing", null)).andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("DOMAIN_VALIDATION"));
        call("POST", "/admin/" + kind, admin, person("unknown", UUID.randomUUID().toString()))
            .andExpect(status().isNotFound());
    }

    @Test
    void teacherCreatedStudentInheritsSchoolAndTeacherOwnershipStaysUnchanged() throws Exception {
        String teacher = login(teacherLogin, "School@123");
        String body = person("teacherStudent", null).replace("}", ",\"instrumentId\":\"" + instrument + "\"}");
        create(teacher, "/teacher/students", body);
        schoolOf("teacherStudent", schoolA);
        create(teacher, "/teacher/lessons", lesson(enrollmentA));
        call("POST", "/teacher/lessons", teacher, lesson(enrollmentB)).andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("OWNERSHIP_DENIED"));
        call("GET", "/admin/students", teacher, null).andExpect(status().isForbidden());
        String sameSchoolTeacher = create(admin, "/admin/teachers", person("anotherTeacher", schoolA));
        call("PUT", "/admin/teachers/" + sameSchoolTeacher + "/instruments", admin,
            "{\"instrumentIds\":[\"" + instrument + "\"]}").andExpect(status().isOk());
        String otherEnrollment = create(admin, "/admin/enrollments", enrollment(studentA, sameSchoolTeacher));
        call("POST", "/teacher/lessons", teacher, lesson(otherEnrollment)).andExpect(status().isForbidden());
    }
}
