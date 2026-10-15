package br.com.harmonia.teacher;

import br.com.harmonia.TestcontainersConfiguration;
import br.com.harmonia.application.lesson.port.LessonAttachmentRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
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
import org.springframework.test.web.servlet.ResultActions;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class LessonAttachmentIT {
    private static final byte[] PDF = "%PDF-1.7\nscore".getBytes(StandardCharsets.US_ASCII);

    @Autowired MockMvc mvc;
    @Autowired LessonAttachmentRepository attachments;
    @TempDir static Path storageDir;

    private String admin;
    private String teacher;
    private String student;
    private String instrument;
    private String enrollment;
    private String lessonId;

    @DynamicPropertySource
    static void storageProperties(DynamicPropertyRegistry registry) {
        registry.add("app.storage.local-dir", () -> storageDir.toString());
    }

    @BeforeEach
    void createLesson() throws Exception {
        String suffix = UUID.randomUUID().toString();
        admin = login("admin", "Admin@123");
        instrument = postId(admin, "/admin/instruments", "{\"name\":\"Attachment-" + suffix + "\"}");
        String teacherName = "attachmentTeacher-" + suffix;
        String studentName = "attachmentStudent-" + suffix;
        String teacherId = person("teachers", teacherName);
        String studentId = person("students", studentName);
        enrollment = postId(admin, "/admin/enrollments", """
            {"studentId":"%s","teacherId":"%s","instrumentId":"%s"}
            """.formatted(studentId, teacherId, instrument));
        teacher = login(teacherName, "Attach@123");
        student = login(studentName, "Attach@123");
        lessonId = newLesson(LocalDate.now().plusDays(2), "09:00", "10:00");
    }

    private String login(String username, String password) throws Exception {
        String body = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content("""
                {"login":"%s","password":"%s"}
                """.formatted(username, password)))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    private String postId(String token, String path, String json) throws Exception {
        String body = mvc.perform(post(path).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    private String person(String role, String username) throws Exception {
        String instruments = "teachers".equals(role) ? ",\"instrumentIds\":[\"" + instrument + "\"]" : "";
        return postId(admin, "/admin/" + role, """
            {"username":"%s","email":"%s@h.local","password":"Attach@123","name":"%s"%s}
            """.formatted(username, username, username, instruments));
    }

    private String newLesson(LocalDate date, String start, String end) throws Exception {
        return postId(teacher, "/teacher/lessons", """
            {"enrollmentId":"%s","date":"%s","startTime":"%s","endTime":"%s","content":"Score"}
            """.formatted(enrollment, date, start, end));
    }

    private String teacherPath(String id) {
        return "/teacher/lessons/" + id + "/attachments";
    }

    private String studentPath(String id, String attachmentId) {
        return "/me/lessons/" + id + "/attachments/" + attachmentId;
    }

    private MockMultipartFile pdf() {
        return new MockMultipartFile("file", "score.pdf", "application/pdf", PDF);
    }

    private ResultActions upload(String token, String id, MockMultipartFile file) throws Exception {
        return mvc.perform(multipart(teacherPath(id)).file(file).header("Authorization", "Bearer " + token));
    }

    private String uploadPdf(String token, String id) throws Exception {
        String body = upload(token, id, pdf()).andExpect(status().isOk())
            .andExpect(jsonPath("$.id").isString())
            .andExpect(jsonPath("$.fileName").value("score.pdf"))
            .andExpect(jsonPath("$.contentType").value("application/pdf"))
            .andExpect(jsonPath("$.sizeBytes").value(PDF.length))
            .andExpect(jsonPath("$.createdAt").isString())
            .andExpect(jsonPath("$.storagePath").doesNotHaveJsonPath())
            .andExpect(jsonPath("$.lesson").doesNotHaveJsonPath())
            .andExpect(jsonPath("$.length()").value(5))
            .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    private Path storedFile(String attachmentId) {
        return storageDir.resolve(attachments.findById(UUID.fromString(attachmentId)).orElseThrow().getStoragePath());
    }

    private ResultActions download(String token, String path) throws Exception {
        return mvc.perform(get(path).header("Authorization", "Bearer " + token));
    }

    @Test
    void teacherUpload_studentSeesAndDownloads_identicalBytesAndDeleteRemovesFile() throws Exception {
        String attachmentId = uploadPdf(teacher, lessonId);
        Path file = storedFile(attachmentId);
        assertThat(Files.readAllBytes(file)).containsExactly(PDF);
        for (String prefix : new String[] {"/me", "/teacher"}) {
            String token = "/me".equals(prefix) ? student : teacher;
            download(token, prefix + "/lessons/" + lessonId).andExpect(status().isOk())
                .andExpect(jsonPath("$.attachments.length()").value(1))
                .andExpect(jsonPath("$.attachments[0].id").value(attachmentId))
                .andExpect(jsonPath("$.attachments[0].fileName").value("score.pdf"))
                .andExpect(jsonPath("$.attachments[0].contentType").value("application/pdf"))
                .andExpect(jsonPath("$.attachments[0].sizeBytes").value(PDF.length))
                .andExpect(jsonPath("$.attachments[0].storagePath").doesNotHaveJsonPath());
        }
        download(student, studentPath(lessonId, attachmentId)).andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_OCTET_STREAM))
            .andExpect(header().string("X-Content-Type-Options", "nosniff"))
            .andExpect(content().bytes(PDF));
        download(teacher, teacherPath(lessonId) + "/" + attachmentId).andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_OCTET_STREAM))
            .andExpect(content().bytes(PDF));

        mvc.perform(delete(teacherPath(lessonId) + "/" + attachmentId).header("Authorization", "Bearer " + teacher))
            .andExpect(status().isNoContent()).andExpect(content().string(""));

        assertThat(attachments.findById(UUID.fromString(attachmentId))).isEmpty();
        assertThat(Files.exists(file)).isFalse();
        download(student, "/me/lessons/" + lessonId).andExpect(status().isOk())
            .andExpect(jsonPath("$.attachments").isEmpty());
        download(student, studentPath(lessonId, attachmentId)).andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void upload_longDisplayName_preservesMetadataAndStoresDownloadableBytes() throws Exception {
        String name = "x".repeat(300) + ".pdf";
        var file = new MockMultipartFile("file", name, "application/pdf", PDF);
        String body = upload(teacher, lessonId, file).andExpect(status().isOk())
            .andExpect(jsonPath("$.fileName").value(name.substring(name.length() - 255)))
            .andExpect(jsonPath("$.storagePath").doesNotHaveJsonPath())
            .andReturn().getResponse().getContentAsString();
        String attachmentId = JsonPath.read(body, "$.id");

        assertThat(Files.readAllBytes(storedFile(attachmentId))).containsExactly(PDF);
        download(student, studentPath(lessonId, attachmentId)).andExpect(status().isOk())
            .andExpect(content().bytes(PDF));
    }

    @Test
    void anotherStudentOrTeacher_cannotAccessLessonAttachments() throws Exception {
        String attachmentId = uploadPdf(teacher, lessonId);
        String otherStudent = "otherAttachmentStudent-" + UUID.randomUUID();
        person("students", otherStudent);
        String otherStudentToken = login(otherStudent, "Attach@123");
        download(otherStudentToken, studentPath(lessonId, attachmentId)).andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("OWNERSHIP_DENIED"));
        download(otherStudentToken, "/me/lessons/" + lessonId).andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("OWNERSHIP_DENIED"));
        String otherTeacher = "otherAttachmentTeacher-" + UUID.randomUUID();
        person("teachers", otherTeacher);
        String otherTeacherToken = login(otherTeacher, "Attach@123");
        upload(otherTeacherToken, lessonId, pdf()).andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("OWNERSHIP_DENIED"));
        download(otherTeacherToken, teacherPath(lessonId) + "/" + attachmentId).andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("OWNERSHIP_DENIED"));
        mvc.perform(delete(teacherPath(lessonId) + "/" + attachmentId)
                .header("Authorization", "Bearer " + otherTeacherToken))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("OWNERSHIP_DENIED"));
        upload(student, lessonId, pdf()).andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
        mvc.perform(delete(teacherPath(lessonId) + "/" + attachmentId).header("Authorization", "Bearer " + student))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
        assertThat(Files.exists(storedFile(attachmentId))).isTrue();
        assertThat(attachments.countByLessonId(UUID.fromString(lessonId))).isEqualTo(1);
    }

    @Test
    void adminWithoutTeacherOrStudentProfile_canUploadDownloadAndDelete() throws Exception {
        String attachmentId = uploadPdf(admin, lessonId);
        Path file = storedFile(attachmentId);

        download(admin, teacherPath(lessonId) + "/" + attachmentId).andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_OCTET_STREAM)).andExpect(content().bytes(PDF));
        download(admin, studentPath(lessonId, attachmentId)).andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_OCTET_STREAM)).andExpect(content().bytes(PDF));
        mvc.perform(delete(teacherPath(lessonId) + "/" + attachmentId).header("Authorization", "Bearer " + admin))
            .andExpect(status().isNoContent());
        assertThat(Files.exists(file)).isFalse();
    }

    @Test
    void disguisedExecutableAndEmptyFile_returnDomainValidation() throws Exception {
        var disguised = new MockMultipartFile("file", "score.pdf", "application/pdf", new byte[] {'M', 'Z', 0, 0});
        upload(teacher, lessonId, disguised).andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("DOMAIN_VALIDATION"))
            .andExpect(jsonPath("$.message").value("Attachment must be a PDF, image, audio or video file"));
        var exe = new MockMultipartFile("file", "score.exe", "application/pdf", PDF);
        upload(teacher, lessonId, exe).andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.message").value("Attachment must be a PDF, image, audio or video file"));
        var empty = new MockMultipartFile("file", "score.pdf", "application/pdf", new byte[0]);
        upload(teacher, lessonId, empty).andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("DOMAIN_VALIDATION"))
            .andExpect(jsonPath("$.message").value("Attachment is empty"));
        assertThat(attachments.countByLessonId(UUID.fromString(lessonId))).isZero();
    }

    @Test
    void eleventhAttachment_returnsDomainValidationWithoutCreatingRow() throws Exception {
        for (int i = 0; i < 10; i++) uploadPdf(teacher, lessonId);

        upload(teacher, lessonId, pdf()).andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("DOMAIN_VALIDATION"))
            .andExpect(jsonPath("$.message").value("Lesson already has 10 attachments"));
        assertThat(attachments.countByLessonId(UUID.fromString(lessonId))).isEqualTo(10);
    }

    @Test
    void attachmentOfAnotherLesson_returnsNotFoundForDeleteAndBothDownloads() throws Exception {
        String otherLesson = newLesson(LocalDate.now().plusDays(2), "11:00", "12:00");
        String attachmentId = uploadPdf(teacher, otherLesson);
        Path file = storedFile(attachmentId);

        mvc.perform(delete(teacherPath(lessonId) + "/" + attachmentId).header("Authorization", "Bearer " + teacher))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
        download(teacher, teacherPath(lessonId) + "/" + attachmentId).andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        download(student, studentPath(lessonId, attachmentId)).andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        assertThat(attachments.findById(UUID.fromString(attachmentId))).isPresent();
        assertThat(Files.readAllBytes(file)).containsExactly(PDF);
    }

    @Test
    void canceledLesson_rejectsMutationsButAllowsDownloads() throws Exception {
        String attachmentId = uploadPdf(teacher, lessonId);
        mvc.perform(patch("/teacher/lessons/" + lessonId + "/status").header("Authorization", "Bearer " + teacher)
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CANCELED\"}"))
            .andExpect(status().isOk());

        upload(teacher, lessonId, pdf()).andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("DOMAIN_VALIDATION"))
            .andExpect(jsonPath("$.message").value("Canceled lessons cannot be edited"));
        mvc.perform(delete(teacherPath(lessonId) + "/" + attachmentId).header("Authorization", "Bearer " + teacher))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("DOMAIN_VALIDATION"))
            .andExpect(jsonPath("$.message").value("Canceled lessons cannot be edited"));
        download(teacher, teacherPath(lessonId) + "/" + attachmentId).andExpect(status().isOk())
            .andExpect(content().bytes(PDF));
        download(student, studentPath(lessonId, attachmentId)).andExpect(status().isOk())
            .andExpect(content().bytes(PDF));
    }

    @Test
    void doneLesson_allowsUploadAndDelete() throws Exception {
        String done = newLesson(LocalDate.now().minusDays(1), "09:00", "10:00");
        String attachmentId = uploadPdf(teacher, done);
        Path file = storedFile(attachmentId);

        mvc.perform(delete(teacherPath(done) + "/" + attachmentId).header("Authorization", "Bearer " + teacher))
            .andExpect(status().isNoContent());
        assertThat(Files.exists(file)).isFalse();
    }

    @Test
    void missingLessonOrAttachment_returnsNotFound() throws Exception {
        String missing = UUID.randomUUID().toString();
        upload(teacher, missing, pdf()).andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        for (String id : new String[] {missing, lessonId}) {
            mvc.perform(delete(teacherPath(id) + "/" + missing).header("Authorization", "Bearer " + teacher))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
            download(teacher, teacherPath(id) + "/" + missing).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
            download(student, studentPath(id, missing)).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        }
    }
}
