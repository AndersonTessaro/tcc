package br.com.harmonia.auth;

import br.com.harmonia.TestcontainersConfiguration;
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
class PasswordResetIT {

    @Autowired MockMvc mvc;

    @Test
    void forgot_unknownEmail_still204() throws Exception {
        mvc.perform(post("/auth/forgot-password").contentType("application/json")
                .content("{\"email\":\"naoexiste@x.com\"}"))
            .andExpect(status().isNoContent());
    }

    @Test
    void reset_invalidToken_is400() throws Exception {
        mvc.perform(post("/auth/reset-password").contentType("application/json")
                .content("{\"token\":\"xxx\",\"novaSenha\":\"NovaSenha1\"}"))
            .andExpect(status().isBadRequest());
    }
}
