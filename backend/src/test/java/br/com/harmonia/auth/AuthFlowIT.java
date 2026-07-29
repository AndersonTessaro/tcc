package br.com.harmonia.auth;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AuthFlowIT {

    @Autowired MockMvc mvc;

    @Test
    void login_then_me_then_refresh() throws Exception {
        var loginResult = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"admin\",\"password\":\"Admin@123\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken", not(emptyString())))
            .andExpect(jsonPath("$.authorities", hasItem("ROLE_ADMIN")))
            .andReturn();
        String access = JsonPath.read(loginResult.getResponse().getContentAsString(), "$.accessToken");
        Cookie refreshCookie = loginResult.getResponse().getCookie("refresh_token");
        assertNotNull(refreshCookie, "login response must set the refresh_token cookie");

        mvc.perform(get("/auth/me").header("Authorization", "Bearer " + access))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.username", is("admin")));

        var refreshResult = mvc.perform(post("/auth/refresh").cookie(refreshCookie))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken", not(emptyString())))
            .andReturn();
        Cookie rotatedCookie = refreshResult.getResponse().getCookie("refresh_token");
        assertNotNull(rotatedCookie, "refresh response must rotate the refresh_token cookie");
        assertNotEquals(refreshCookie.getValue(), rotatedCookie.getValue());

        // old refresh cookie now invalid (rotated)
        mvc.perform(post("/auth/refresh").cookie(refreshCookie))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void refresh_withoutCookie_is401() throws Exception {
        mvc.perform(post("/auth/refresh")).andExpect(status().isUnauthorized());
    }

    @Test
    void me_withoutToken_is401() throws Exception {
        mvc.perform(get("/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void login_badCredentials_is401() throws Exception {
        mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"admin\",\"password\":\"errada\"}"))
            .andExpect(status().isUnauthorized());
    }
}
