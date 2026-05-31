package br.com.harmonia.auth;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AuthFlowIT {

    @Autowired MockMvc mvc;

    @Test
    void login_then_me_then_refresh() throws Exception {
        String body = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"admin\",\"senha\":\"Admin@123\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken", not(emptyString())))
            .andExpect(jsonPath("$.authorities", hasItem("ROLE_ADMIN")))
            .andReturn().getResponse().getContentAsString();
        String access = JsonPath.read(body, "$.accessToken");
        String refresh = JsonPath.read(body, "$.refreshToken");

        mvc.perform(get("/auth/me").header("Authorization", "Bearer " + access))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.username", is("admin")));

        mvc.perform(post("/auth/refresh").contentType("application/json")
                .content("{\"refreshToken\":\"" + refresh + "\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken", not(emptyString())));

        // refresh antigo agora inválido (rotacionado)
        mvc.perform(post("/auth/refresh").contentType("application/json")
                .content("{\"refreshToken\":\"" + refresh + "\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void me_withoutToken_is401() throws Exception {
        mvc.perform(get("/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void login_badCredentials_is401() throws Exception {
        mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"admin\",\"senha\":\"errada\"}"))
            .andExpect(status().isUnauthorized());
    }
}
