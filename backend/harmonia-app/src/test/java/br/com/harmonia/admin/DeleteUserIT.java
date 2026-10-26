package br.com.harmonia.admin;

import br.com.harmonia.teacher.MoreMenuITSupport;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class DeleteUserIT extends MoreMenuITSupport {
    @TempDir static Path storageDir;
    private String instrumentId;
    private String teacherId;
    private String studentId;
    private String enrollment;
    private String teacherToken;
    private String studentToken;
    private UUID teacherUserId;
    private UUID studentUserId;
    private final List<Path> files = new ArrayList<>();

    @DynamicPropertySource
    static void storage(DynamicPropertyRegistry registry) {
        registry.add("app.storage.local-dir", () -> storageDir.toString());
    }

    @BeforeEach
    void setUp() throws Exception {
        instrumentId = instrument();
        teacherId = teacher("deleteT", instrumentId);
        studentId = student("deleteS");
        enrollment = enroll(studentId, teacherId, instrumentId, "null");
        teacherUserId = jdbc.queryForObject("SELECT user_id FROM teacher WHERE id = ?", UUID.class, uuid(teacherId));
        studentUserId = jdbc.queryForObject("SELECT user_id FROM student WHERE id = ?", UUID.class, uuid(studentId));
        teacherToken = login("deleteT" + suffix, "Teach@1234");
        studentToken = login("deleteS" + suffix, "Student@123");
    }

    private UUID uuid(String id) {
        return UUID.fromString(id);
    }

    private void assertRows(String table, String column, Object id, int count) {
        assertThat(jdbc.queryForObject("SELECT count(*) FROM " + table + " WHERE " + column + " = ?", Integer.class, id))
            .as(table + "." + column).isEqualTo(count);
    }

    private void remember(String sql, Object id) {
        files.add(storageDir.resolve(jdbc.queryForObject(sql, String.class, id)));
    }

    private String attachment(String token, String lessonId) throws Exception {
        String body = mvc.perform(multipart("/teacher/lessons/" + lessonId + "/attachments")
                .file(new MockMultipartFile("file", "score.pdf", "application/pdf", "%PDF-1.7 score".getBytes()))
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.id");
        remember("SELECT storage_path FROM lesson_attachment WHERE id = ?", uuid(id));
        return id;
    }

    private void avatar(String token, UUID userId) throws Exception {
        mvc.perform(multipart(HttpMethod.PUT, "/account/avatar")
                .file(new MockMultipartFile("file", "avatar.jpg", "image/jpeg", new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0}))
                .header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        remember("SELECT avatar_path FROM auth_user WHERE id = ?", userId);
    }

    private UUID seedHistory() throws Exception {
        String original = lesson(teacherToken, enrollment, today.minusDays(1), "09:00", "10:00");
        String replacement = lesson(teacherToken, enrollment, today.plusDays(2), "09:00", "10:00");
        jdbc.update("INSERT INTO makeup_lesson (original_lesson_id, new_lesson_id) VALUES (?, ?)", uuid(original), uuid(replacement));
        mvc.perform(post("/teacher/lessons/" + original + "/attendance").header("Authorization", "Bearer " + teacherToken)
                .contentType("application/json").content("{\"status\":\"PRESENT\"}"))
            .andExpect(status().isOk());
        jdbc.update("INSERT INTO schedule (enrollment_id, weekday, start_time, end_time) VALUES (?, 'MONDAY', '14:00', '15:00')", uuid(enrollment));
        jdbc.update("INSERT INTO teacher_student_note (teacher_id, student_id, shared_notes) VALUES (?, ?, 'Keep practicing')",
            uuid(teacherId), uuid(studentId));
        attachment(teacherToken, original);
        String material = mvc.perform(multipart("/teacher/students/" + studentId + "/materials")
                .file(new MockMultipartFile("file", "book.pdf", "application/pdf", "%PDF-1.7 book".getBytes()))
                .param("title", "Book").header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        remember("SELECT storage_path FROM material WHERE id = ?", uuid(JsonPath.read(material, "$.id")));
        return uuid(original);
    }

    private UUID seedPractice() throws Exception {
        String body = mvc.perform(post("/me/practices").header("Authorization", "Bearer " + studentToken)
                .contentType("application/json").content("{\"durationMin\":20}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        UUID id = uuid(JsonPath.read(body, "$.practiceId"));
        mvc.perform(multipart("/me/practices/" + id + "/recording")
                .file(new MockMultipartFile("file", "practice.mp3", "audio/mpeg", "ID3 recording".getBytes()))
                .header("Authorization", "Bearer " + studentToken)).andExpect(status().isOk());
        remember("SELECT recording_storage_path FROM practice WHERE id = ?", id);
        return id;
    }

    @Test
    void deletesStudentWithFullHistoryFilesAndTokensAndPreventsLogin() throws Exception {
        UUID original = seedHistory();
        UUID practice = seedPractice();
        avatar(studentToken, studentUserId);
        String goal = postId(studentToken, "/me/goals", """
            {"title":"Practice","type":"PRACTICE_TIME","period":"WEEKLY","target":120}
            """);
        UUID financialTransaction = UUID.randomUUID();
        jdbc.update("INSERT INTO financial_transaction (id, type, amount, date, student_id) VALUES (?, 'INCOME', 100, ?, ?)",
            financialTransaction, today, uuid(studentId));
        jdbc.update("INSERT INTO auth_password_reset_token (token_hash, user_id, expires_at) VALUES (?, ?, now() + interval '1 day')",
            UUID.randomUUID().toString(), studentUserId);
        jdbc.update("""
            INSERT INTO notification (user_id, type, title, body, student_id, lesson_id, practice_id)
            VALUES (?, 'PRACTICE_RECORDED', 'Practice', 'Recorded', ?, ?, ?)
            """, teacherUserId, uuid(studentId), original, practice);
        assertThat(files).hasSize(4).allMatch(Files::exists);
        var refresh = mvc.perform(post("/auth/login").contentType("application/json").content("""
                {"login":"deleteS%s","password":"Student@123"}
                """.formatted(suffix))).andExpect(status().isOk()).andReturn().getResponse().getCookie("refresh_token");

        mvc.perform(delete("/admin/users/" + studentUserId).header("Authorization", "Bearer " + admin))
            .andExpect(status().isNoContent());

        assertRows("auth_user", "id", studentUserId, 0);
        assertRows("student", "id", uuid(studentId), 0);
        assertRows("enrollment", "id", uuid(enrollment), 0);
        assertRows("lesson", "enrollment_id", uuid(enrollment), 0);
        assertRows("attendance", "lesson_id", original, 0);
        assertRows("lesson_attachment", "lesson_id", original, 0);
        assertRows("makeup_lesson", "original_lesson_id", original, 0);
        assertRows("schedule", "enrollment_id", uuid(enrollment), 0);
        for (String table : List.of("material", "practice", "progress", "goal", "teacher_student_note", "financial_transaction", "notification"))
            assertRows(table, "student_id", uuid(studentId), 0);
        for (String table : List.of("auth_user_roles", "auth_refresh_token", "auth_password_reset_token"))
            assertRows(table, "user_id", studentUserId, 0);
        assertRows("goal", "id", uuid(goal), 0);
        assertRows("teacher", "id", uuid(teacherId), 1);
        assertRows("financial_transaction", "id", financialTransaction, 1);
        assertThat(jdbc.queryForObject("SELECT student_id FROM financial_transaction WHERE id = ?", UUID.class, financialTransaction)).isNull();
        assertThat(files).noneMatch(Files::exists);
        mvc.perform(post("/auth/login").contentType("application/json").content("""
                {"login":"deleteS%s","password":"Student@123"}
                """.formatted(suffix))).andExpect(status().isUnauthorized());
        mvc.perform(post("/auth/refresh").cookie(refresh)).andExpect(status().isUnauthorized());
    }

    @Test
    void deletesTeacherEnrollmentsClassesAndFilesButPreservesStudentPracticeAndGoal() throws Exception {
        UUID original = seedHistory();
        String goal = postId(teacherToken, "/teacher/students/" + studentId + "/goals", """
            {"title":"Practice","type":"PRACTICE_TIME","period":"WEEKLY","target":120}
            """);
        UUID group = UUID.randomUUID();
        jdbc.update("INSERT INTO class_group (id, name, teacher_id, instrument_id) VALUES (?, 'Class', ?, ?)",
            group, uuid(teacherId), uuid(instrumentId));
        jdbc.update("UPDATE enrollment SET class_group_id = ? WHERE id = ?", group, uuid(enrollment));
        avatar(teacherToken, teacherUserId);
        List<Path> deletedFiles = List.copyOf(files);
        String otherTeacher = teacher("deleteOtherT", instrumentId);
        String otherToken = login("deleteOtherT" + suffix, "Teach@1234");
        String otherEnrollment = enroll(studentId, otherTeacher, instrumentId, "null");
        jdbc.update("UPDATE enrollment SET class_group_id = ? WHERE id = ?", group, uuid(otherEnrollment));
        String otherLesson = lesson(otherToken, otherEnrollment, today.plusDays(3), "10:00", "11:00");
        String otherAttachment = attachment(otherToken, otherLesson);
        Path preservedAttachment = files.getLast();
        UUID practice = seedPractice();
        Path recording = files.getLast();

        mvc.perform(delete("/admin/users/" + teacherUserId).header("Authorization", "Bearer " + admin))
            .andExpect(status().isNoContent());

        assertRows("auth_user", "id", teacherUserId, 0);
        assertRows("teacher", "id", uuid(teacherId), 0);
        assertRows("teacher_instrument", "teacher_id", uuid(teacherId), 0);
        assertRows("class_group", "id", group, 0);
        assertRows("enrollment", "id", uuid(enrollment), 0);
        assertRows("enrollment", "id", uuid(otherEnrollment), 1);
        assertThat(jdbc.queryForObject("SELECT class_group_id FROM enrollment WHERE id = ?", UUID.class, uuid(otherEnrollment))).isNull();
        assertRows("lesson", "id", uuid(otherLesson), 1);
        assertRows("lesson_attachment", "id", uuid(otherAttachment), 1);
        assertRows("lesson", "enrollment_id", uuid(enrollment), 0);
        assertRows("attendance", "lesson_id", original, 0);
        assertRows("lesson_attachment", "lesson_id", original, 0);
        assertRows("material", "teacher_id", uuid(teacherId), 0);
        assertRows("teacher_student_note", "teacher_id", uuid(teacherId), 0);
        assertRows("practice", "id", practice, 1);
        assertRows("student", "id", uuid(studentId), 1);
        assertRows("goal", "id", uuid(goal), 1);
        assertThat(jdbc.queryForObject("SELECT created_by_teacher_id FROM goal WHERE id = ?", UUID.class, uuid(goal))).isNull();
        assertThat(deletedFiles).noneMatch(Files::exists);
        assertThat(Files.exists(preservedAttachment)).isTrue();
        assertThat(Files.exists(recording)).isTrue();
        login("deleteS" + suffix, "Student@123");
    }

    @Test
    void selfDeletionReturnsConflict() throws Exception {
        UUID adminId = jdbc.queryForObject("SELECT id FROM auth_user WHERE username = 'admin'", UUID.class);
        mvc.perform(delete("/admin/users/" + adminId).header("Authorization", "Bearer " + admin))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("DUPLICATE_RESOURCE"));
    }

    @Test
    void deletingAnotherAdminReturnsConflict() throws Exception {
        jdbc.update("INSERT INTO auth_user_roles (user_id, role_id) SELECT ?, id FROM auth_role WHERE name = 'ADMIN'", studentUserId);
        mvc.perform(delete("/admin/users/" + studentUserId).header("Authorization", "Bearer " + admin))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("DUPLICATE_RESOURCE"));
        assertRows("auth_user", "id", studentUserId, 1);
    }

    @Test
    void unknownUserReturnsNotFound() throws Exception {
        mvc.perform(delete("/admin/users/" + UUID.randomUUID()).header("Authorization", "Bearer " + admin))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void deletionRequiresAdminOrUserManagementPermission() throws Exception {
        mvc.perform(delete("/admin/users/" + studentUserId)).andExpect(status().isUnauthorized());
        mvc.perform(delete("/admin/users/" + studentUserId).header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isForbidden());
        UUID managerRole = UUID.randomUUID();
        String roleName = "MANAGER_" + managerRole;
        Long roleId = jdbc.queryForObject("INSERT INTO auth_role (name, description) VALUES (?, 'User manager') RETURNING id", Long.class, roleName);
        jdbc.update("INSERT INTO auth_role_permissions (role_id, permission_id) SELECT ?, id FROM auth_permission WHERE name = 'auth.user.manage'", roleId);
        jdbc.update("INSERT INTO auth_user_roles (user_id, role_id) VALUES (?, ?)", teacherUserId, roleId);
        String manager = login("deleteT" + suffix, "Teach@1234");
        mvc.perform(delete("/admin/users/" + studentUserId).header("Authorization", "Bearer " + manager))
            .andExpect(status().isNoContent());
    }
}
