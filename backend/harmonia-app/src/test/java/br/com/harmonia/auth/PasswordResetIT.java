package br.com.harmonia.auth;

import br.com.harmonia.TestcontainersConfiguration;
import br.com.harmonia.application.security.port.PasswordResetTokenRepository;
import br.com.harmonia.application.security.port.UserRepository;
import br.com.harmonia.domain.security.RefreshTokenHasher;
import br.com.harmonia.infrastructure.persistence.security.PasswordResetToken;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class PasswordResetIT {

    @Autowired MockMvc mvc;
    @Autowired PasswordResetTokenRepository resetTokens;
    @Autowired UserRepository users;
    private final RefreshTokenHasher hasher = new RefreshTokenHasher();

    @Test
    void forgot_unknownEmail_still204() throws Exception {
        mvc.perform(post("/auth/forgot-password").contentType("application/json")
                .content("{\"email\":\"naoexiste@x.com\"}"))
            .andExpect(status().isNoContent());
    }

    @Test
    void reset_invalidToken_is400() throws Exception {
        mvc.perform(post("/auth/reset-password").contentType("application/json")
                .content("{\"token\":\"xxx\",\"newPassword\":\"NovaSenha1\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void reset_revokesExistingRefreshTokens() throws Exception {
        String admin = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"admin\",\"password\":\"Admin@123\"}"))
            .andReturn().getResponse().getContentAsString();
        String adminToken = com.jayway.jsonpath.JsonPath.read(admin, "$.accessToken");
        mvc.perform(post("/admin/students").header("Authorization", "Bearer " + adminToken)
                .contentType("application/json")
                .content("{\"username\":\"resetflowuser\",\"email\":\"resetflowuser@h.local\",\"password\":\"Flow@1234\",\"name\":\"Reset Flow User\"}"))
            .andExpect(status().isOk());

        // capture an active refresh token for the user before self-service reset
        Cookie oldRefresh = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"resetflowuser\",\"password\":\"Flow@1234\"}"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getCookie("refresh_token");

        // mint a reset token directly (bypassing email delivery - BUG-C01 no longer logs it)
        String raw = hasher.newOpaqueToken();
        var user = users.findByUsername("resetflowuser").orElseThrow();
        PasswordResetToken prt = new PasswordResetToken();
        prt.setTokenHash(hasher.sha256Hex(raw));
        prt.setUser(user);
        prt.setExpiresAt(LocalDateTime.now().plusMinutes(30));
        resetTokens.save(prt);

        mvc.perform(post("/auth/reset-password").contentType("application/json")
                .content("{\"token\":\"" + raw + "\",\"newPassword\":\"NovaSenha@1\"}"))
            .andExpect(status().isNoContent());

        // H-01: refresh token issued before self-service reset must now be revoked
        mvc.perform(post("/auth/refresh").cookie(oldRefresh))
            .andExpect(status().isUnauthorized());
    }
}
