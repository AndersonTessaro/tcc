package br.com.harmonia.security;

import br.com.harmonia.TestcontainersConfiguration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.concurrent.atomic.AtomicInteger;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("Segurança — bots (força bruta e flood nas rotas públicas)")
@SpringBootTest(properties = "app.security.auth-rate-limit-per-minute=" + BotProtectionIT.LIMIT)
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class BotProtectionIT {
    static final int LIMIT = 5;
    private static final AtomicInteger NEXT_IP = new AtomicInteger(1);

    @Autowired MockMvc mvc;

    private static RequestPostProcessor fromNewIp() {
        String ip = "203.0.113." + NEXT_IP.getAndIncrement();
        return request -> {
            request.setRemoteAddr(ip);
            return request;
        };
    }

    private ResultActions login(RequestPostProcessor ip, String password) throws Exception {
        return mvc.perform(post("/auth/login").with(ip).contentType("application/json")
            .content("{\"login\":\"admin\",\"password\":\"" + password + "\"}"));
    }

    @Test
    @DisplayName("bot de força bruta é bloqueado (429) depois do limite, mesmo acertando a senha")
    void bruteForceLoginIsBlocked() throws Exception {
        RequestPostProcessor bot = fromNewIp();
        for (int attempt = 1; attempt <= LIMIT; attempt++) {
            login(bot, "chute-" + attempt).andExpect(status().isUnauthorized());
        }
        login(bot, "chute-final").andExpect(status().isTooManyRequests())
            .andExpect(header().exists("Retry-After"))
            .andExpect(jsonPath("$.code").value("TOO_MANY_REQUESTS"));
        login(bot, "Admin@123").andExpect(status().isTooManyRequests())
            .andExpect(jsonPath("$.accessToken").doesNotExist());
    }

    @Test
    @DisplayName("variações de URL (;param, //) contam no mesmo limite e não driblam o bloqueio")
    void urlVariationsShareTheLimit() throws Exception {
        RequestPostProcessor bot = fromNewIp();
        for (int attempt = 0; attempt < LIMIT; attempt++) login(bot, "chute");
        for (String variant : new String[] {"/auth/login;jsessionid=x", "/auth//login"}) {
            mvc.perform(post(variant).with(bot).contentType("application/json")
                    .content("{\"login\":\"admin\",\"password\":\"Admin@123\"}"))
                .andExpect(status().isTooManyRequests());
        }
    }

    @Test
    @DisplayName("bloqueio vale só para o IP do bot; usuário legítimo em outro IP entra")
    void blockIsPerClient() throws Exception {
        RequestPostProcessor bot = fromNewIp();
        for (int attempt = 0; attempt <= LIMIT; attempt++) login(bot, "chute");
        login(bot, "Admin@123").andExpect(status().isTooManyRequests());

        login(fromNewIp(), "Admin@123").andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").isString());
    }

    @Test
    @DisplayName("logins corretos repetidos (usuário legítimo, testes E2E) não são bloqueados")
    void successfulLoginsDoNotSpendTheQuota() throws Exception {
        RequestPostProcessor user = fromNewIp();
        for (int attempt = 0; attempt < LIMIT * 3; attempt++) {
            login(user, "Admin@123").andExpect(status().isOk());
        }
    }

    @Test
    @DisplayName("flood no 'esqueci a senha' (spam de e-mail) é bloqueado")
    void forgotPasswordFloodIsBlocked() throws Exception {
        RequestPostProcessor bot = fromNewIp();
        for (int attempt = 1; attempt <= LIMIT; attempt++) {
            mvc.perform(post("/auth/forgot-password").with(bot).contentType("application/json")
                .content("{\"email\":\"vitima" + attempt + "@h.local\"}")).andExpect(status().isNoContent());
        }
        mvc.perform(post("/auth/forgot-password").with(bot).contentType("application/json")
            .content("{\"email\":\"vitima@h.local\"}")).andExpect(status().isTooManyRequests());
    }

    @Test
    @DisplayName("força bruta no token de redefinição de senha é bloqueada")
    void resetTokenGuessingIsBlocked() throws Exception {
        RequestPostProcessor bot = fromNewIp();
        for (int attempt = 1; attempt <= LIMIT; attempt++) {
            mvc.perform(post("/auth/reset-password").with(bot).contentType("application/json")
                .content("{\"token\":\"chute-" + attempt + "\",\"newPassword\":\"Nova@12345\"}"))
                .andExpect(status().isBadRequest());
        }
        mvc.perform(post("/auth/reset-password").with(bot).contentType("application/json")
            .content("{\"token\":\"chute\",\"newPassword\":\"Nova@12345\"}")).andExpect(status().isTooManyRequests());
    }
}
