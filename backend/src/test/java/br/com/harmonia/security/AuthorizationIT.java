package br.com.harmonia.security;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AuthorizationIT {

    @Autowired MockMvc mvc;

    private String loginAdmin() throws Exception {
        String body = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"admin\",\"password\":\"Admin@123\"}"))
            .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    @Test
    void admin_canAccess() throws Exception {
        mvc.perform(get("/admin/ping").header("Authorization", "Bearer " + loginAdmin()))
            .andExpect(status().isOk());
    }

    @Test
    void noToken_is401() throws Exception {
        mvc.perform(get("/admin/ping")).andExpect(status().isUnauthorized());
    }
}
