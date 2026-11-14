package br.com.harmonia.chat;

import br.com.harmonia.teacher.MoreMenuITSupport;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ChatIT extends MoreMenuITSupport {
    private String instrumentId;
    private String teacherId;
    private String studentId;
    private String enrollmentId;
    private String teacherToken;
    private String studentToken;
    private String teacherMessages;
    private String studentMessages;

    @BeforeEach
    void setUp() throws Exception {
        instrumentId = instrument();
        teacherId = teacher("ChatTeacher", instrumentId);
        studentId = student("ChatStudent");
        enrollmentId = enroll(studentId, teacherId, instrumentId, "null");
        teacherToken = login("ChatTeacher" + suffix, "Teach@1234");
        studentToken = login("ChatStudent" + suffix, "Student@123");
        teacherMessages = "/teacher/chats/" + studentId + "/messages";
        studentMessages = "/me/chats/" + teacherId + "/messages";
    }

    @Test
    void messagesAreBidirectionalAndReadingOnlyClearsTheReadersIncomingMessages() throws Exception {
        String teacherMessage = send(teacherToken, teacherMessages, "Hello student");
        String studentMessage = send(studentToken, studentMessages, "Hello teacher");
        assertCount(teacherToken, "/teacher", 1);
        assertCount(studentToken, "/me", 1);
        request(teacherToken, get("/teacher/chats"))
            .andExpect(jsonPath("$[0].studentId").value(studentId))
            .andExpect(jsonPath("$[0].studentName").value("ChatStudent"))
            .andExpect(jsonPath("$[0].lastMessage").value("Hello teacher"))
            .andExpect(jsonPath("$[0].lastMessageAt").isString())
            .andExpect(jsonPath("$[0].unread").value(1));
        request(studentToken, get("/me/chats"))
            .andExpect(jsonPath("$[0].teacherId").value(teacherId))
            .andExpect(jsonPath("$[0].teacherName").value("ChatTeacher"))
            .andExpect(jsonPath("$[0].lastMessage").value("Hello teacher"))
            .andExpect(jsonPath("$[0].unread").value(1));
        request(studentToken, get(studentMessages)).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].id").value(teacherMessage))
            .andExpect(jsonPath("$[0].body").value("Hello student"))
            .andExpect(jsonPath("$[0].sentAt").isString())
            .andExpect(jsonPath("$[0].mine").value(false))
            .andExpect(jsonPath("$[1].id").value(studentMessage))
            .andExpect(jsonPath("$[1].mine").value(true))
            .andExpect(jsonPath("$[0].senderUserId").doesNotHaveJsonPath());
        assertCount(studentToken, "/me", 0);
        assertCount(teacherToken, "/teacher", 1);
        request(studentToken, get("/me/chats")).andExpect(jsonPath("$[0].unread").value(0));
        LocalDateTime readAt = jdbc.queryForObject("SELECT read_at FROM chat_message WHERE id = ?",
            LocalDateTime.class, UUID.fromString(teacherMessage));
        request(studentToken, get(studentMessages)).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT read_at FROM chat_message WHERE id = ?", LocalDateTime.class,
            UUID.fromString(teacherMessage))).isEqualTo(readAt);
        request(teacherToken, get(teacherMessages)).andExpect(status().isOk())
            .andExpect(jsonPath("$[0].mine").value(true))
            .andExpect(jsonPath("$[1].mine").value(false));
        assertCount(teacherToken, "/teacher", 0);
        request(teacherToken, get("/teacher/chats")).andExpect(jsonPath("$[0].unread").value(0));
    }

    @Test
    void teacherListOrdersRecentMessagesThenNamesWithEmptyConversationsLastAndDeduplicatesEnrollments() throws Exception {
        String alpha = student("Alpha");
        String zulu = student("Zulu");
        String beta = student("Beta");
        for (String id : List.of(alpha, zulu, beta)) enroll(id, teacherId, instrumentId, "null");
        String secondInstrument = postId(admin, "/admin/instruments", "{\"name\":\"ChatOther-" + suffix + "\"}");
        jdbc.update("INSERT INTO teacher_instrument (teacher_id, instrument_id) VALUES (?, ?)",
            UUID.fromString(teacherId), UUID.fromString(secondInstrument));
        enroll(studentId, teacherId, secondInstrument, "null");
        String oldMessage = send(teacherToken, teacherMessages, "Older");
        String newMessage = send(teacherToken, "/teacher/chats/" + zulu + "/messages", "Newest");
        setSentAt(oldMessage, "2026-01-01T10:00:00");
        setSentAt(newMessage, "2026-01-02T10:00:00");
        request(teacherToken, get("/teacher/chats")).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(4))
            .andExpect(jsonPath("$[0].studentId").value(zulu)).andExpect(jsonPath("$[1].studentId").value(studentId)).andExpect(jsonPath("$[2].studentId").value(alpha)).andExpect(jsonPath("$[3].studentId").value(beta))
            .andExpect(jsonPath("$[0].lastMessage").value("Newest"))
            .andExpect(jsonPath("$[2].lastMessage").value(nullValue()))
            .andExpect(jsonPath("$[2].lastMessageAt").value(nullValue()))
            .andExpect(jsonPath("$[2].unread").value(0));
        setSentAt(newMessage, "2026-01-01T10:00:00");
        request(teacherToken, get("/teacher/chats"))
            .andExpect(jsonPath("$[0].studentId").value(studentId)).andExpect(jsonPath("$[1].studentId").value(zulu)).andExpect(jsonPath("$[2].studentId").value(alpha)).andExpect(jsonPath("$[3].studentId").value(beta));
    }

    @Test
    void studentListOrdersRecentMessagesThenNamesWithEmptyConversationsLast() throws Exception {
        String alpha = teacher("Alpha", instrumentId);
        String zulu = teacher("Zulu", instrumentId);
        String beta = teacher("Beta", instrumentId);
        for (String id : List.of(alpha, zulu, beta)) enroll(studentId, id, instrumentId, "null");
        String oldMessage = send(studentToken, studentMessages, "Older");
        String newMessage = send(studentToken, "/me/chats/" + zulu + "/messages", "Newest");
        setSentAt(oldMessage, "2026-01-01T10:00:00");
        setSentAt(newMessage, "2026-01-02T10:00:00");
        request(studentToken, get("/me/chats")).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(4))
            .andExpect(jsonPath("$[0].teacherId").value(zulu)).andExpect(jsonPath("$[1].teacherId").value(teacherId)).andExpect(jsonPath("$[2].teacherId").value(alpha)).andExpect(jsonPath("$[3].teacherId").value(beta))
            .andExpect(jsonPath("$[2].lastMessage").value(nullValue()))
            .andExpect(jsonPath("$[2].lastMessageAt").value(nullValue()));
        setSentAt(newMessage, "2026-01-01T10:00:00");
        request(studentToken, get("/me/chats"))
            .andExpect(jsonPath("$[0].teacherId").value(teacherId)).andExpect(jsonPath("$[1].teacherId").value(zulu)).andExpect(jsonPath("$[2].teacherId").value(alpha)).andExpect(jsonPath("$[3].teacherId").value(beta));
    }

    @Test
    void unknownAndUnlinkedPairsAreNotFoundForReadsAndWrites() throws Exception {
        String otherTeacher = teacher("OtherTeacher", instrumentId);
        String otherStudent = student("OtherStudent");
        String otherTeacherToken = login("OtherTeacher" + suffix, "Teach@1234");
        String otherStudentToken = login("OtherStudent" + suffix, "Student@123");
        assertPairNotFound(otherTeacherToken, teacherMessages);
        assertPairNotFound(otherStudentToken, studentMessages);
        assertPairNotFound(teacherToken, "/teacher/chats/" + otherStudent + "/messages");
        assertPairNotFound(studentToken, "/me/chats/" + otherTeacher + "/messages");
        assertPairNotFound(teacherToken, "/teacher/chats/" + UUID.randomUUID() + "/messages");
        assertPairNotFound(studentToken, "/me/chats/" + UUID.randomUUID() + "/messages");
    }

    @ParameterizedTest
    @ValueSource(strings = {"CLOSED", "SUSPENDED"})
    void inactivePairsDisappearAndBecomeNotFound(String enrollmentStatus) throws Exception {
        send(teacherToken, teacherMessages, "For student");
        send(studentToken, studentMessages, "For teacher");
        jdbc.update("UPDATE enrollment SET status = ? WHERE id = ?", enrollmentStatus, UUID.fromString(enrollmentId));
        assertHiddenPair();
    }

    @Test
    void pairsFromDifferentSchoolsAreHiddenEvenWithAnActiveLegacyEnrollment() throws Exception {
        send(teacherToken, teacherMessages, "For student");
        send(studentToken, studentMessages, "For teacher");
        String schoolId = postId(admin, "/admin/schools", "{\"name\":\"Chat school " + suffix + "\"}");
        jdbc.update("UPDATE auth_user SET school_id = ? WHERE id = (SELECT user_id FROM student WHERE id = ?)",
            UUID.fromString(schoolId), UUID.fromString(studentId));
        assertHiddenPair();
    }

    @Test
    void anotherActiveEnrollmentKeepsTheConversationAvailable() throws Exception {
        String secondInstrument = postId(admin, "/admin/instruments", "{\"name\":\"ChatSecond-" + suffix + "\"}");
        jdbc.update("INSERT INTO teacher_instrument (teacher_id, instrument_id) VALUES (?, ?)",
            UUID.fromString(teacherId), UUID.fromString(secondInstrument));
        enroll(studentId, teacherId, secondInstrument, "null");
        jdbc.update("UPDATE enrollment SET status = 'CLOSED' WHERE id = ?", UUID.fromString(enrollmentId));
        send(teacherToken, teacherMessages, "Still active");
        request(studentToken, get(studentMessages)).andExpect(status().isOk())
            .andExpect(jsonPath("$[0].body").value("Still active"));
        request(teacherToken, get("/teacher/chats")).andExpect(jsonPath("$.length()").value(1));
        request(studentToken, get("/me/chats")).andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void rejectsBlankMissingNullAndOverlongBodiesOnBothSides() throws Exception {
        for (String body : List.of("", " \t\r\n ", "\u2003", "a".repeat(2001))) {
            request(teacherToken, post(teacherMessages).contentType("application/json").content(payload(body)))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("VALIDATION"));
            request(studentToken, post(studentMessages).contentType("application/json").content(payload(body)))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("VALIDATION"));
        }
        for (String body : List.of("{}", "{\"body\":null}")) {
            request(teacherToken, post(teacherMessages).contentType("application/json").content(body))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("VALIDATION"));
            request(studentToken, post(studentMessages).contentType("application/json").content(body))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("VALIDATION"));
        }
    }

    @Test
    void acceptsTrimmedMaximumLengthAndStoresHtmlAndSqlLookingTextVerbatim() throws Exception {
        send(teacherToken, teacherMessages, "  " + "a".repeat(2000) + " \t");
        String plainText = "<script>alert('hello')</script>\nRobert'); DROP TABLE chat_message; -- 🎵";
        String id = send(studentToken, studentMessages, plainText);
        assertThat(jdbc.queryForObject("SELECT body FROM chat_message WHERE id = ?", String.class,
            UUID.fromString(id))).isEqualTo(plainText);
        request(teacherToken, get(teacherMessages)).andExpect(status().isOk())
            .andExpect(jsonPath("$[0].body").value("a".repeat(2000)))
            .andExpect(jsonPath("$[1].body").value(plainText));
    }

    @Test
    void returnsTheLatestTwoHundredInAscendingOrderAndMarksIncomingHistoryRead() throws Exception {
        jdbc.update("""
            INSERT INTO chat_message (teacher_id, student_id, sender_user_id, body, created_at)
            SELECT ?, ?, (SELECT user_id FROM teacher WHERE id = ?), 'Message ' || n,
                   TIMESTAMP '2026-01-01 10:00:00' + n * INTERVAL '1 second'
            FROM generate_series(1, 205) n
            """, UUID.fromString(teacherId), UUID.fromString(studentId), UUID.fromString(teacherId));
        assertCount(studentToken, "/me", 205);
        request(studentToken, get(studentMessages)).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(200))
            .andExpect(jsonPath("$[0].body").value("Message 6"))
            .andExpect(jsonPath("$[199].body").value("Message 205"))
            .andExpect(jsonPath("$[0].mine").value(false));
        assertCount(studentToken, "/me", 0);
        request(teacherToken, get(teacherMessages)).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(200))
            .andExpect(jsonPath("$[0].mine").value(true));
    }

    @Test
    void allRoutesRequireAuthentication() throws Exception {
        for (String base : List.of("/teacher/chats", "/me/chats")) {
            mvc.perform(get(base)).andExpect(status().isUnauthorized());
            mvc.perform(get(base + "/unread-count")).andExpect(status().isUnauthorized());
            String messagesPath = base + "/" + UUID.randomUUID() + "/messages";
            mvc.perform(get(messagesPath)).andExpect(status().isUnauthorized());
            mvc.perform(post(messagesPath).contentType("application/json").content(payload("Hello")))
                .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void adminWithoutTheMatchingProfileGetsProfileRequiredOnEveryRoute() throws Exception {
        for (String base : List.of("/teacher/chats", "/me/chats")) {
            for (String path : List.of(base, base + "/unread-count", base + "/" + UUID.randomUUID() + "/messages"))
                request(admin, get(path)).andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("PROFILE_REQUIRED"));
            request(admin, post(base + "/" + UUID.randomUUID() + "/messages")
                .contentType("application/json").content(payload("Hello"))).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("PROFILE_REQUIRED"));
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMIN", "MANAGER"})
    void privilegedRolesDoNotBypassPairOwnership(String role) throws Exception {
        jdbc.update("""
            INSERT INTO auth_user_roles (user_id, role_id)
            SELECT user_id, (SELECT id FROM auth_role WHERE name = ?) FROM teacher WHERE id = ?
            """, role, UUID.fromString(teacherId));
        String token = login("ChatTeacher" + suffix, "Teach@1234");
        String otherStudent = student("Unlinked");
        assertPairNotFound(token, "/teacher/chats/" + otherStudent + "/messages");
    }

    @Test
    void readPermissionDoesNotGrantWriteAndWritePermissionDoesNotGrantRead() throws Exception {
        replacePermissions("teacher", teacherId, "chat.read");
        replacePermissions("student", studentId, "chat.write");
        teacherToken = login("ChatTeacher" + suffix, "Teach@1234");
        studentToken = login("ChatStudent" + suffix, "Student@123");
        request(teacherToken, get("/teacher/chats")).andExpect(status().isOk());
        request(teacherToken, post(teacherMessages).contentType("application/json").content(payload("Forbidden")))
            .andExpect(status().isForbidden());
        send(studentToken, studentMessages, "Allowed");
        for (String path : List.of("/me/chats", "/me/chats/unread-count", studentMessages))
            request(studentToken, get(path)).andExpect(status().isForbidden());
        replacePermissions("teacher", teacherId, "chat.write");
        replacePermissions("student", studentId, "chat.read");
        teacherToken = login("ChatTeacher" + suffix, "Teach@1234");
        studentToken = login("ChatStudent" + suffix, "Student@123");
        send(teacherToken, teacherMessages, "Allowed");
        for (String path : List.of("/teacher/chats", "/teacher/chats/unread-count", teacherMessages))
            request(teacherToken, get(path)).andExpect(status().isForbidden());
        request(studentToken, get("/me/chats")).andExpect(status().isOk());
        request(studentToken, post(studentMessages).contentType("application/json").content(payload("Forbidden")))
            .andExpect(status().isForbidden());
    }

    @Test
    void capturesExactResponseExamples() throws Exception {
        send(teacherToken, teacherMessages, "Hello student");
        String rows = request(studentToken, get("/me/chats")).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        String message = request(studentToken, get(studentMessages)).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        Files.createDirectories(Path.of("target"));
        Files.writeString(Path.of("target/chat-response-examples.json"),
            "{\"listRow\":" + rows.substring(1, rows.length() - 1)
                + ",\"message\":" + message.substring(1, message.length() - 1) + "}");
    }

    private void assertHiddenPair() throws Exception {
        assertPairNotFound(teacherToken, teacherMessages);
        assertPairNotFound(studentToken, studentMessages);
        request(teacherToken, get("/teacher/chats")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        request(studentToken, get("/me/chats")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        assertCount(teacherToken, "/teacher", 0);
        assertCount(studentToken, "/me", 0);
    }

    private void assertPairNotFound(String token, String path) throws Exception {
        request(token, get(path)).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
        request(token, post(path).contentType("application/json").content(payload("Hidden")))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    private void assertCount(String token, String prefix, int count) throws Exception {
        request(token, get(prefix + "/chats/unread-count")).andExpect(status().isOk())
            .andExpect(jsonPath("$.count").value(count));
    }

    private String send(String token, String path, String body) throws Exception {
        String response = request(token, post(path).contentType("application/json").content(payload(body)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.mine").value(true))
            .andExpect(jsonPath("$.body").value(body.strip())).andExpect(jsonPath("$.sentAt").isString())
            .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return JsonPath.read(response, "$.id");
    }

    private ResultActions request(String token, MockHttpServletRequestBuilder builder) throws Exception {
        return mvc.perform(builder.header("Authorization", "Bearer " + token));
    }

    private String payload(String body) {
        return JsonPath.parse("{}").put("$", "body", body).jsonString();
    }

    private void setSentAt(String id, String sentAt) {
        jdbc.update("UPDATE chat_message SET created_at = ? WHERE id = ?", LocalDateTime.parse(sentAt), UUID.fromString(id));
    }

    private void replacePermissions(String profile, String profileId, String permission) {
        UUID userId = jdbc.queryForObject("SELECT user_id FROM " + profile + " WHERE id = ?", UUID.class, UUID.fromString(profileId));
        Long roleId = jdbc.queryForObject("INSERT INTO auth_role (name, description) VALUES (?, 'Chat test') RETURNING id",
            Long.class, "CHAT_" + UUID.randomUUID());
        jdbc.update("INSERT INTO auth_role_permissions (role_id, permission_id) SELECT ?, id FROM auth_permission WHERE name = ?",
            roleId, permission);
        jdbc.update("DELETE FROM auth_user_roles WHERE user_id = ?", userId);
        jdbc.update("INSERT INTO auth_user_roles (user_id, role_id) VALUES (?, ?)", userId, roleId);
    }
}
