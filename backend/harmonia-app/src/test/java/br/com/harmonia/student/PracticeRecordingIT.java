package br.com.harmonia.student;

import br.com.harmonia.TestcontainersConfiguration;
import br.com.harmonia.application.gamification.port.PracticeRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class PracticeRecordingIT {

    @Autowired MockMvc mvc;
    @Autowired PracticeRepository practices;
    @TempDir static Path storageDir;

    @DynamicPropertySource
    static void storageProperties(DynamicPropertyRegistry registry) {
        registry.add("app.storage.local-dir", () -> storageDir.toString());
    }

    private record Fixture(String admin, String studentId, String studentToken, String teacherToken,
                           String practiceId) {}

    private String login(String username, String password) throws Exception {
        String body = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"" + username + "\",\"password\":\"" + password + "\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    private String postId(String token, String path, String json) throws Exception {
        String body = mvc.perform(post(path).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    private String person(String admin, String role, String username, String instrumentId) throws Exception {
        String instruments = instrumentId == null ? "" : ",\"instrumentIds\":[\"" + instrumentId + "\"]";
        return postId(admin, "/admin/" + role,
            "{\"username\":\"" + username + "\",\"email\":\"" + username + "@h.local\","
                + "\"password\":\"Practice@123\",\"name\":\"" + username + "\"" + instruments + "}");
    }

    private Fixture fixture() throws Exception {
        String suffix = UUID.randomUUID().toString();
        String admin = login("admin", "Admin@123");
        String instrument = postId(admin, "/admin/instruments", "{\"name\":\"Recording-" + suffix + "\"}");
        String teacherName = "teacherRecording-" + suffix;
        String studentName = "studentRecording-" + suffix;
        String teacherId = person(admin, "teachers", teacherName, instrument);
        String studentId = person(admin, "students", studentName, null);
        postId(admin, "/admin/enrollments", "{\"studentId\":\"" + studentId + "\",\"teacherId\":\""
            + teacherId + "\",\"instrumentId\":\"" + instrument + "\"}");
        String studentToken = login(studentName, "Practice@123");
        String registration = mvc.perform(post("/me/practices").header("Authorization", "Bearer " + studentToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"durationMin\":30}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.practiceId").isString())
            .andExpect(jsonPath("$.xpTotal").value(30))
            .andExpect(jsonPath("$.level").value(1))
            .andExpect(jsonPath("$.streakDays").value(1))
            .andExpect(jsonPath("$.totalPracticeMin").value(30))
            .andExpect(jsonPath("$.length()").value(5))
            .andReturn().getResponse().getContentAsString();
        String practiceId = JsonPath.read(registration, "$.practiceId");
        assertThat(UUID.fromString(practiceId)).isNotNull();
        return new Fixture(admin, studentId, studentToken, login(teacherName, "Practice@123"), practiceId);
    }

    private MockMultipartFile video() {
        return new MockMultipartFile("file", "practice.mp4", "video/mp4", new byte[] {0, 0, 0, 0x18, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm'});
    }

    private String mine(Fixture fixture) {
        return "/me/practices/" + fixture.practiceId() + "/recording";
    }

    private String teacherRecording(Fixture fixture) {
        return "/teacher/practices/" + fixture.practiceId() + "/recording";
    }

    private void assertProgressUnchanged(Fixture fixture) throws Exception {
        mvc.perform(get("/me/progress").header("Authorization", "Bearer " + fixture.studentToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.xpTotal").value(30))
            .andExpect(jsonPath("$.level").value(1))
            .andExpect(jsonPath("$.streakDays").value(1))
            .andExpect(jsonPath("$.totalPracticeMin").value(30));
    }

    @Test
    void recording_uploadListDownloadAndReplace_preservesProgress() throws Exception {
        Fixture fixture = fixture();
        mvc.perform(get("/me/practices").header("Authorization", "Bearer " + fixture.studentToken()))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].recording").value((Object) null));
        mvc.perform(multipart(mine(fixture)).file(video())
                .header("Authorization", "Bearer " + fixture.studentToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(fixture.practiceId()))
            .andExpect(jsonPath("$.recording.fileName").value("practice.mp4"))
            .andExpect(jsonPath("$.recording.contentType").value("video/mp4"))
            .andExpect(jsonPath("$.recording.sizeBytes").value(12))
            .andExpect(jsonPath("$.recording.uploadedAt").isString())
            .andExpect(jsonPath("$.recording.storagePath").doesNotHaveJsonPath())
            .andExpect(jsonPath("$.student").doesNotHaveJsonPath());
        assertProgressUnchanged(fixture);
        String oldPath = practices.findById(UUID.fromString(fixture.practiceId())).orElseThrow()
            .getRecording().getStoragePath();
        assertThat(Files.exists(storageDir.resolve(oldPath))).isTrue();
        mvc.perform(get("/me/practices").header("Authorization", "Bearer " + fixture.studentToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].recording.sizeBytes").value(12))
            .andExpect(jsonPath("$[0].recording.storagePath").doesNotHaveJsonPath());
        mvc.perform(get(mine(fixture)).header("Authorization", "Bearer " + fixture.studentToken()))
            .andExpect(status().isOk()).andExpect(content().contentType(MediaType.APPLICATION_OCTET_STREAM))
            .andExpect(header().string("X-Content-Type-Options", "nosniff"))
            .andExpect(content().bytes(new byte[] {0, 0, 0, 0x18, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm'}));
        mvc.perform(get("/teacher/students/" + fixture.studentId() + "/practices")
                .header("Authorization", "Bearer " + fixture.teacherToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(fixture.practiceId()))
            .andExpect(jsonPath("$[0].recording.fileName").value("practice.mp4"))
            .andExpect(jsonPath("$[0].recording.storagePath").doesNotHaveJsonPath());
        mvc.perform(get(teacherRecording(fixture)).header("Authorization", "Bearer " + fixture.teacherToken()))
            .andExpect(status().isOk()).andExpect(content().contentType(MediaType.APPLICATION_OCTET_STREAM))
            .andExpect(content().bytes(new byte[] {0, 0, 0, 0x18, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm'}));

        var replacement = new MockMultipartFile("file", "replacement.mp3", "audio/mpeg", new byte[] {'I', 'D', '3', 4, 0, 0});
        mvc.perform(multipart(mine(fixture)).file(replacement)
                .header("Authorization", "Bearer " + fixture.studentToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.recording.fileName").value("replacement.mp3"))
            .andExpect(jsonPath("$.recording.sizeBytes").value(6));
        String newPath = practices.findById(UUID.fromString(fixture.practiceId())).orElseThrow()
            .getRecording().getStoragePath();
        assertThat(newPath).isNotEqualTo(oldPath);
        assertThat(Files.exists(storageDir.resolve(oldPath))).isFalse();
        assertThat(Files.readAllBytes(storageDir.resolve(newPath))).containsExactly('I', 'D', '3', 4, 0, 0);
        mvc.perform(get(mine(fixture)).header("Authorization", "Bearer " + fixture.studentToken()))
            .andExpect(status().isOk()).andExpect(content().bytes(new byte[] {'I', 'D', '3', 4, 0, 0}));
        mvc.perform(get(teacherRecording(fixture)).header("Authorization", "Bearer " + fixture.teacherToken()))
            .andExpect(status().isOk()).andExpect(content().bytes(new byte[] {'I', 'D', '3', 4, 0, 0}));
        mvc.perform(get("/me/practices").header("Authorization", "Bearer " + fixture.studentToken()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].recording.fileName").value("replacement.mp3"));
        assertProgressUnchanged(fixture);
    }

    @Test
    void recording_invalidFile_returnsDomainValidation() throws Exception {
        Fixture fixture = fixture();
        var pdf = new MockMultipartFile("file", "a.pdf", "application/pdf", new byte[] {1});
        mvc.perform(multipart(mine(fixture)).file(pdf).header("Authorization", "Bearer " + fixture.studentToken()))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("DOMAIN_VALIDATION"))
            .andExpect(jsonPath("$.message").value("Recording must be an audio or video file"));
        var disguised = new MockMultipartFile("file", "malware.mp4", "video/mp4", new byte[] {'M', 'Z', (byte) 0x90, 0, 3, 0});
        mvc.perform(multipart(mine(fixture)).file(disguised).header("Authorization", "Bearer " + fixture.studentToken()))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("DOMAIN_VALIDATION"))
            .andExpect(jsonPath("$.message").value("Recording must be an audio or video file"));
        var empty = new MockMultipartFile("file", "empty.mp4", "video/mp4", new byte[0]);
        mvc.perform(multipart(mine(fixture)).file(empty).header("Authorization", "Bearer " + fixture.studentToken()))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("DOMAIN_VALIDATION"))
            .andExpect(jsonPath("$.message").value("Recording is empty"));
        assertProgressUnchanged(fixture);
        assertThat(practices.findById(UUID.fromString(fixture.practiceId())).orElseThrow().getRecording()).isNull();
    }

    @Test
    void recording_missingPracticeOrRecording_returnsNotFound() throws Exception {
        Fixture fixture = fixture();
        mvc.perform(get(mine(fixture)).header("Authorization", "Bearer " + fixture.studentToken()))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"))
            .andExpect(jsonPath("$.message").value("Recording not found"));
        mvc.perform(get(teacherRecording(fixture)).header("Authorization", "Bearer " + fixture.teacherToken()))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
        String missingId = UUID.randomUUID().toString();
        String missing = "/me/practices/" + missingId + "/recording";
        mvc.perform(multipart(missing).file(video()).header("Authorization", "Bearer " + fixture.studentToken()))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"))
            .andExpect(jsonPath("$.message").value("Practice not found"));
        mvc.perform(get(missing).header("Authorization", "Bearer " + fixture.studentToken()))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mvc.perform(get("/teacher/practices/" + missingId + "/recording")
                .header("Authorization", "Bearer " + fixture.teacherToken()))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void recording_otherStudentOrUnlinkedTeacher_returnsOwnershipDenied() throws Exception {
        Fixture fixture = fixture();
        mvc.perform(multipart(mine(fixture)).file(video()).header("Authorization", "Bearer " + fixture.studentToken()))
            .andExpect(status().isOk());
        String otherStudent = "otherRecording-" + UUID.randomUUID();
        person(fixture.admin(), "students", otherStudent, null);
        String otherToken = login(otherStudent, "Practice@123");
        mvc.perform(multipart(mine(fixture)).file(video()).header("Authorization", "Bearer " + otherToken))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("OWNERSHIP_DENIED"));
        mvc.perform(get(mine(fixture)).header("Authorization", "Bearer " + otherToken))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("OWNERSHIP_DENIED"));
        String otherTeacher = "unlinkedRecording-" + UUID.randomUUID();
        person(fixture.admin(), "teachers", otherTeacher, null);
        String teacherToken = login(otherTeacher, "Practice@123");
        mvc.perform(get("/teacher/students/" + fixture.studentId() + "/practices")
                .header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("OWNERSHIP_DENIED"));
        mvc.perform(get(teacherRecording(fixture)).header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("OWNERSHIP_DENIED"));
        mvc.perform(multipart(mine(fixture)).file(video())
                .header("Authorization", "Bearer " + fixture.teacherToken()))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    void recording_admin_bypassesOwnershipWithoutStudentOrTeacherProfile() throws Exception {
        Fixture fixture = fixture();
        mvc.perform(multipart(mine(fixture)).file(video()).header("Authorization", "Bearer " + fixture.admin()))
            .andExpect(status().isOk());
        mvc.perform(get(mine(fixture)).header("Authorization", "Bearer " + fixture.admin()))
            .andExpect(status().isOk()).andExpect(content().bytes(new byte[] {0, 0, 0, 0x18, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm'}));
        mvc.perform(get("/teacher/students/" + fixture.studentId() + "/practices")
                .header("Authorization", "Bearer " + fixture.admin()))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(fixture.practiceId()));
        mvc.perform(get(teacherRecording(fixture)).header("Authorization", "Bearer " + fixture.admin()))
            .andExpect(status().isOk()).andExpect(content().bytes(new byte[] {0, 0, 0, 0x18, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm'}));
        assertProgressUnchanged(fixture);
    }
}
