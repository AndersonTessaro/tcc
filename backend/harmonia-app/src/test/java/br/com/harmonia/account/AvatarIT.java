package br.com.harmonia.account;

import br.com.harmonia.teacher.MoreMenuITSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.ResultActions;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AvatarIT extends MoreMenuITSupport {
    @TempDir static Path storageDir;
    private static final byte[] PNG = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0};
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0, 1};
    private String studentId;
    private UUID userId;
    private String studentToken;
    private String teacherToken;
    private String instrument;

    @DynamicPropertySource
    static void storage(DynamicPropertyRegistry registry) {
        registry.add("app.storage.local-dir", () -> storageDir.toString());
    }

    @BeforeEach
    void setUp() throws Exception {
        instrument = instrument();
        String teacherId = teacher("avatarT", instrument);
        studentId = student("avatarS");
        enroll(studentId, teacherId, instrument, "null");
        userId = jdbc.queryForObject("SELECT user_id FROM student WHERE id = ?", UUID.class, UUID.fromString(studentId));
        studentToken = login("avatarS" + suffix, "Student@123");
        teacherToken = login("avatarT" + suffix, "Teach@1234");
    }

    private ResultActions upload(String token, byte[] bytes) throws Exception {
        return mvc.perform(multipart(HttpMethod.PUT, "/account/avatar")
            .file(new MockMultipartFile("file", "avatar.png", "image/png", bytes))
            .header("Authorization", "Bearer " + token));
    }

    private Path storedFile() {
        return storageDir.resolve(jdbc.queryForObject("SELECT avatar_path FROM auth_user WHERE id = ?", String.class, userId));
    }

    @Test
    void uploadGetReplaceAndDeletePreserveBytesTypesAndRemoveOldFiles() throws Exception {
        mvc.perform(get("/account/avatar").header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isNotFound());
        upload(studentToken, PNG).andExpect(status().isNoContent());
        Path old = storedFile();
        mvc.perform(get("/account/avatar").header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk()).andExpect(content().contentType("image/png")).andExpect(content().bytes(PNG));
        mvc.perform(get("/users/" + userId + "/avatar").header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk()).andExpect(content().bytes(PNG));

        upload(studentToken, JPEG).andExpect(status().isNoContent());
        Path replacement = storedFile();
        assertThat(replacement).isNotEqualTo(old);
        assertThat(Files.exists(old)).isFalse();
        mvc.perform(get("/account/avatar").header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk()).andExpect(content().contentType("image/jpeg")).andExpect(content().bytes(JPEG));

        mvc.perform(delete("/account/avatar").header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isNoContent());
        assertThat(Files.exists(replacement)).isFalse();
        mvc.perform(get("/account/avatar").header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mvc.perform(get("/account").header("Authorization", "Bearer " + studentToken))
            .andExpect(jsonPath("$.hasAvatar").value(false));
        mvc.perform(delete("/account/avatar").header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isNoContent());
    }

    @Test
    void avatarIsExposedThroughAccountAuthAndTeacherStudentResponsesWithoutStoragePath() throws Exception {
        upload(studentToken, PNG).andExpect(status().isNoContent());
        for (String path : new String[]{"/account", "/auth/me"}) {
            mvc.perform(get(path).header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.hasAvatar").value(true))
                .andExpect(jsonPath("$.avatarPath").doesNotHaveJsonPath());
        }
        mvc.perform(get("/teacher/students").header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == '%s')].hasAvatar".formatted(studentId), contains(true)))
            .andExpect(jsonPath("$[?(@.id == '%s')].userId".formatted(studentId), contains(userId.toString())));
        mvc.perform(get("/teacher/students/" + studentId).header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.hasAvatar").value(true))
            .andExpect(jsonPath("$.userId").value(userId.toString()));
    }

    @Test
    void linkedTeacherSeesStudentBio() throws Exception {
        mvc.perform(put("/account").header("Authorization", "Bearer " + studentToken).contentType("application/json")
            .content("""
                {"displayName":"Aluno","bio":"Toco violão"}
                """)).andExpect(status().isOk());
        mvc.perform(get("/teacher/students/" + studentId).header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.bio").value("Toco violão"));
    }

    @Test
    void onlySelfLinkedTeacherAndAdminCanReadStudentAvatar() throws Exception {
        upload(studentToken, PNG).andExpect(status().isNoContent());
        for (String token : new String[]{teacherToken, admin}) {
            mvc.perform(get("/users/" + userId + "/avatar").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(content().bytes(PNG));
        }
        teacher("avatarOtherT", instrument);
        student("avatarOtherS");
        for (String token : new String[]{login("avatarOtherT" + suffix, "Teach@1234"),
                login("avatarOtherS" + suffix, "Student@123")}) {
            mvc.perform(get("/users/" + userId + "/avatar").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("OWNERSHIP_DENIED"));
        }
    }

    @Test
    void rejectsBadTypeEmptyAndOversizedUploadsWithDomainValidation() throws Exception {
        for (byte[] bytes : new byte[][]{"%PDF-1.7".getBytes(), "RIFFxxxxWEBP".getBytes(), new byte[0], new byte[2 * 1024 * 1024 + 1]}) {
            upload(studentToken, bytes).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("DOMAIN_VALIDATION"));
        }
        mvc.perform(get("/account").header("Authorization", "Bearer " + studentToken))
            .andExpect(jsonPath("$.hasAvatar").value(false));
    }

    @Test
    void avatarsRequireAuthentication() throws Exception {
        mvc.perform(get("/account/avatar")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/account/avatar")).andExpect(status().isUnauthorized());
        mvc.perform(get("/users/" + userId + "/avatar")).andExpect(status().isUnauthorized());
        mvc.perform(multipart(HttpMethod.PUT, "/account/avatar")
                .file(new MockMultipartFile("file", "avatar.png", "image/png", PNG)))
            .andExpect(status().isUnauthorized());
    }
}
