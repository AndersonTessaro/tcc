package br.com.harmonia.admin;

import br.com.harmonia.TestcontainersConfiguration;
import br.com.harmonia.application.gamification.port.PracticeRepository;
import br.com.harmonia.application.profile.port.ClassGroupRepository;
import br.com.harmonia.application.profile.port.InstrumentRepository;
import br.com.harmonia.application.profile.port.StudentRepository;
import br.com.harmonia.application.profile.port.TeacherRepository;
import br.com.harmonia.infrastructure.persistence.gamification.Practice;
import br.com.harmonia.infrastructure.persistence.profile.ClassGroup;
import br.com.harmonia.infrastructure.persistence.profile.EnrollmentStatus;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

import static br.com.harmonia.SchoolTestSupport.school;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class AdminInstrumentDeleteIT {
    @Autowired MockMvc mvc;
    @Autowired InstrumentRepository instruments;
    @Autowired TeacherRepository teachers;
    @Autowired StudentRepository students;
    @Autowired PracticeRepository practices;
    @Autowired ClassGroupRepository classGroups;
    @Autowired EntityManager entityManager;
    @Autowired JdbcTemplate jdbc;
    private String token;
    private String instrument;
    private String suffix;

    @BeforeEach
    void setUp() throws Exception {
        suffix = UUID.randomUUID().toString();
        token = login("admin", "Admin@123");
        instrument = postId("/admin/instruments", "{\"name\":\"Piano " + suffix + "\"}");
    }

    @Test
    void deletesAFreeInstrumentAndRemovesItFromTheList() throws Exception {
        mvc.perform(delete("/admin/instruments/{id}", instrument).header("Authorization", "Bearer " + token))
            .andExpect(status().isNoContent()).andExpect(content().string(""));

        entityManager.flush();
        entityManager.clear();
        assertThat(instruments.existsById(UUID.fromString(instrument))).isFalse();
        mvc.perform(get("/admin/instruments").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$[*].id", not(hasItem(instrument))));
    }

    @ParameterizedTest
    @EnumSource(EnrollmentStatus.class)
    void rejectsEnrollmentsInEveryStatusAndPreservesTheInstrument(EnrollmentStatus enrollmentStatus) throws Exception {
        String teacher = createTeacher("teacher");
        String student = postId("/admin/students", person("student"));
        String enrollment = postId("/admin/enrollments",
            "{\"studentId\":\"%s\",\"teacherId\":\"%s\",\"instrumentId\":\"%s\"}"
                .formatted(student, teacher, instrument));
        mvc.perform(put("/admin/enrollments/{id}/status", enrollment).header("Authorization", "Bearer " + token)
                .contentType("application/json").content("{\"status\":\"" + enrollmentStatus + "\"}"))
            .andExpect(status().isNoContent());

        assertInUse();

        mvc.perform(get("/admin/enrollments").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == '" + enrollment + "')].instrument.id", hasItem(instrument)))
            .andExpect(jsonPath("$[?(@.id == '" + enrollment + "')].status", hasItem(enrollmentStatus.name())));
        assertTeacherHasInstrument(teacher);
    }

    @Test
    void removesTeacherLinksAndPreservesOtherInstrumentsAndTeachers() throws Exception {
        String teacher = createTeacher("teacher");
        String inactiveTeacher = createTeacher("inactiveTeacher");
        String other = postId("/admin/instruments", "{\"name\":\"Violin " + suffix + "\"}");
        mvc.perform(put("/admin/teachers/{id}/instruments", teacher).header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"instrumentIds\":[\"" + instrument + "\",\"" + other + "\"]}"))
            .andExpect(status().isOk());
        var inactive = teachers.findWithInstrumentsById(UUID.fromString(inactiveTeacher)).orElseThrow();
        inactive.setActive(false);
        var managed = teachers.findWithInstrumentsById(UUID.fromString(teacher)).orElseThrow();

        mvc.perform(delete("/admin/instruments/{id}", instrument).header("Authorization", "Bearer " + token))
            .andExpect(status().isNoContent());

        assertThat(managed.getInstruments()).extracting(i -> i.getId().toString()).containsExactly(other);
        assertThat(inactive.getInstruments()).isEmpty();
        entityManager.flush();
        entityManager.clear();
        assertThat(jdbc.queryForObject("select count(*) from teacher_instrument where instrument_id = ?",
            Long.class, UUID.fromString(instrument))).isZero();
        assertThat(teachers.existsById(UUID.fromString(teacher))).isTrue();
        assertThat(teachers.existsById(UUID.fromString(inactiveTeacher))).isTrue();
        mvc.perform(get("/admin/teachers").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == '" + teacher + "')].instruments[*].id", not(hasItem(instrument))))
            .andExpect(jsonPath("$[?(@.id == '" + teacher + "')].instruments[*].id", hasItem(other)));
    }

    @Test
    void rejectsAPracticeReferenceWithoutAnEnrollment() throws Exception {
        String student = postId("/admin/students", person("student"));
        Practice practice = new Practice();
        practice.setStudent(students.findById(UUID.fromString(student)).orElseThrow());
        practice.setInstrument(instruments.findById(UUID.fromString(instrument)).orElseThrow());
        practice.setDate(LocalDate.now());
        practice.setDurationMin(10);
        UUID practiceId = practices.saveAndFlush(practice).getId();

        assertInUse();

        entityManager.clear();
        assertThat(practices.findById(practiceId).orElseThrow().getInstrument().getId())
            .isEqualTo(UUID.fromString(instrument));
    }

    @Test
    void rejectsAnInactiveClassGroupReferenceWithoutAnEnrollment() throws Exception {
        String teacher = createTeacher("teacher");
        ClassGroup group = new ClassGroup();
        group.setName("Group " + suffix);
        group.setTeacher(teachers.findById(UUID.fromString(teacher)).orElseThrow());
        group.setInstrument(instruments.findById(UUID.fromString(instrument)).orElseThrow());
        group.setActive(false);
        UUID groupId = classGroups.saveAndFlush(group).getId();

        assertInUse();

        entityManager.clear();
        assertThat(classGroups.findById(groupId).orElseThrow().getInstrument().getId())
            .isEqualTo(UUID.fromString(instrument));
        assertTeacherHasInstrument(teacher);
    }

    @Test
    void returnsNotFoundForAnUnknownInstrument() throws Exception {
        mvc.perform(delete("/admin/instruments/{id}", UUID.randomUUID()).header("Authorization", "Bearer " + token))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void forbidsManagers() throws Exception {
        String schoolId = postId("/admin/schools", "{\"name\":\"School " + suffix + "\"}");
        postId("/admin/schools/" + schoolId + "/managers", person("manager"));
        String managerToken = login("manager-" + suffix, "Password@123");

        mvc.perform(delete("/admin/instruments/{id}", instrument).header("Authorization", "Bearer " + managerToken))
            .andExpect(status().isForbidden());

        assertInstrumentExists();
    }

    @Test
    void forbidsTeachers() throws Exception {
        createTeacher("teacher");
        String teacherToken = login("teacher-" + suffix, "Password@123");

        mvc.perform(delete("/admin/instruments/{id}", instrument).header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isForbidden());

        assertInstrumentExists();
    }

    @Test
    void requiresAuthentication() throws Exception {
        mvc.perform(delete("/admin/instruments/{id}", instrument)).andExpect(status().isUnauthorized());

        assertInstrumentExists();
    }

    private void assertInUse() throws Exception {
        mvc.perform(delete("/admin/instruments/{id}", instrument).header("Authorization", "Bearer " + token))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("RESOURCE_IN_USE"));
        assertInstrumentExists();
    }

    private void assertInstrumentExists() throws Exception {
        mvc.perform(get("/admin/instruments").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$[*].id", hasItem(instrument)));
    }

    private void assertTeacherHasInstrument(String teacher) throws Exception {
        mvc.perform(get("/admin/teachers").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == '" + teacher + "')].instruments[*].id", hasItem(instrument)));
    }

    private String createTeacher(String name) throws Exception {
        return postId("/admin/teachers", person(name)
            .replace("}", ",\"instrumentIds\":[\"" + instrument + "\"]}"));
    }

    private String person(String prefix) {
        String username = prefix + "-" + suffix;
        return "{\"username\":\"%s\",\"email\":\"%s@h.local\",\"password\":\"Password@123\",\"name\":\"%s\"}"
            .formatted(username, username, username);
    }

    private String login(String username, String password) throws Exception {
        String body = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"%s\",\"password\":\"%s\"}".formatted(username, password)))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    private String postId(String path, String json) throws Exception {
        String body = mvc.perform(post(path).with(school(mvc)).header("Authorization", "Bearer " + token)
                .contentType("application/json").content(json))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }
}
