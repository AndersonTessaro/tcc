package br.com.harmonia.security;

import br.com.harmonia.TestcontainersConfiguration;
import br.com.harmonia.security.SecurityFixture.Account;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;

import java.nio.charset.StandardCharsets;
import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.Signature;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

import static br.com.harmonia.security.SecurityFixture.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("Segurança — criptografia de senhas e tokens")
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class PasswordCryptoSecurityIT {
    private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired PasswordEncoder encoder;

    private SecurityFixture fx;

    @BeforeEach
    void setUp() throws Exception {
        fx = new SecurityFixture(mvc);
    }

    @Test
    @DisplayName("senha é gravada com BCrypt (hash com salt), nunca em texto puro")
    void passwordIsStoredAsSaltedBcryptHash() throws Exception {
        String hash = storedPassword(fx.student().username());
        assertThat(hash).matches("^\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}$").doesNotContain(PASSWORD);
        assertThat(encoder.matches(PASSWORD, hash)).isTrue();
        assertThat(encoder.matches("senha-errada", hash)).isFalse();
        assertThat(storedPassword(fx.student().username()))
            .as("mesma senha gera hash diferente (salt)").isNotEqualTo(hash);
    }

    @Test
    @DisplayName("nenhuma resposta da API devolve senha ou hash")
    void apiNeverReturnsPasswordOrHash() throws Exception {
        Account student = fx.student();
        List<RequestBuilder> requests = List.of(
            get("/auth/me").header("Authorization", "Bearer " + student.token()),
            get("/admin/security/users").header("Authorization", "Bearer " + fx.admin));
        for (RequestBuilder request : requests) {
            String body = mvc.perform(request).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            assertThat(body).doesNotContainIgnoringCase("password").doesNotContain("$2a$").doesNotContain("$2b$");
        }
    }

    @Test
    @DisplayName("refresh token fica só como SHA-256 no banco e vai em cookie HttpOnly")
    void refreshTokenIsStoredOnlyAsSha256() throws Exception {
        Account student = fx.student();
        var response = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"" + student.username() + "\",\"password\":\"" + PASSWORD + "\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.refreshToken").doesNotExist())
            .andReturn().getResponse();
        var cookie = response.getCookie("refresh_token");
        assertThat(cookie).isNotNull();
        assertThat(cookie.isHttpOnly()).isTrue();

        String raw = cookie.getValue();
        String sha256 = HexFormat.of().formatHex(
            MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8)));
        assertThat(countTokens(sha256)).isEqualTo(1);
        assertThat(countTokens(raw)).isZero();
    }

    @Test
    @DisplayName("login errado não revela se o usuário existe")
    void loginFailureDoesNotRevealWhichUsersExist() throws Exception {
        Account student = fx.student();
        String wrongPassword = failedLogin(student.username());
        String unknownUser = failedLogin("nao-existe-" + UUID.randomUUID());
        assertThat(withoutTimestamp(wrongPassword)).isEqualTo(withoutTimestamp(unknownUser));

        mvc.perform(post("/auth/forgot-password").contentType("application/json")
            .content("{\"email\":\"" + student.username() + "@h.local\"}")).andExpect(status().isNoContent());
        mvc.perform(post("/auth/forgot-password").contentType("application/json")
            .content("{\"email\":\"ninguem-" + UUID.randomUUID() + "@h.local\"}")).andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("senha curta (< 8) é recusada")
    void weakPasswordIsRejected() throws Exception {
        String username = "weak-" + UUID.randomUUID();
        mvc.perform(post("/admin/students").with(br.com.harmonia.SchoolTestSupport.school(mvc))
                .header("Authorization", "Bearer " + fx.admin).contentType("application/json").content("""
                    {"username":"%s","email":"%s@h.local","password":"123","name":"Fraco"}
                    """.formatted(username, username)))
            .andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/auth/reset-password").contentType("application/json")
            .content("{\"token\":\"qualquer\",\"newPassword\":\"123\"}")).andExpect(status().isUnprocessableEntity());
    }

    @Test
    @DisplayName("JWT adulterado (payload trocado para ADMIN) é recusado pela assinatura RSA")
    void tamperedJwtIsRejected() throws Exception {
        String[] parts = fx.student().token().split("\\.");
        assertUnauthorized(parts[0] + "." + adminPayload() + "." + parts[2]);
    }

    @Test
    @DisplayName("JWT com alg=none (sem assinatura) é recusado")
    void unsignedJwtIsRejected() throws Exception {
        assertUnauthorized(b64("{\"alg\":\"none\",\"typ\":\"JWT\"}") + "." + adminPayload() + ".");
    }

    @Test
    @DisplayName("JWT assinado com outra chave RSA é recusado")
    void jwtSignedWithForeignKeyIsRejected() throws Exception {
        var generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        String signingInput = b64("{\"alg\":\"RS256\",\"typ\":\"JWT\"}") + "." + adminPayload();
        var signer = Signature.getInstance("SHA256withRSA");
        signer.initSign(generator.generateKeyPair().getPrivate());
        signer.update(signingInput.getBytes(StandardCharsets.US_ASCII));
        assertUnauthorized(signingInput + "." + B64.encodeToString(signer.sign()));
    }

    private void assertUnauthorized(String token) throws Exception {
        mvc.perform(get("/admin/security/users").header("Authorization", "Bearer " + token))
            .andExpect(status().isUnauthorized());
    }

    private static String adminPayload() {
        long now = Instant.now().getEpochSecond();
        return b64("""
            {"iss":"harmonia","sub":"admin","iat":%d,"exp":%d,"authorities":["ROLE_ADMIN","auth.user.manage"]}"""
            .formatted(now, now + 3600));
    }

    private static String b64(String json) {
        return B64.encodeToString(json.getBytes(StandardCharsets.UTF_8));
    }

    private String storedPassword(String username) {
        return jdbc.queryForObject("SELECT password FROM auth_user WHERE username = ?", String.class, username);
    }

    private int countTokens(String tokenHash) {
        return jdbc.queryForObject("SELECT count(*) FROM auth_refresh_token WHERE token_hash = ?", Integer.class, tokenHash);
    }

    private String failedLogin(String login) throws Exception {
        return mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"" + login + "\",\"password\":\"Errada@123\"}"))
            .andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
    }

    private static String withoutTimestamp(String body) {
        return body.replaceAll("\"timestamp\":\"[^\"]+\"", "");
    }
}
