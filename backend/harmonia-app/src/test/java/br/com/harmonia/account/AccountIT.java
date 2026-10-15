package br.com.harmonia.account;

import br.com.harmonia.teacher.MoreMenuITSupport;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AccountIT extends MoreMenuITSupport {
    private String token;
    private String username;

    @BeforeEach
    void setUp() throws Exception {
        teacher("account", instrument());
        username = "account" + suffix;
        token = login(username, "Teach@1234");
    }

    @Test
    void getsAndUpdatesOwnProfileWithoutChangingIdentity() throws Exception {
        mvc.perform(get("/account").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.username").value(username))
            .andExpect(jsonPath("$.roles[0]").value("TEACHER"))
            .andExpect(jsonPath("$.teacher.instruments[0].name").value("Piano-" + suffix));
        mvc.perform(put("/account").header("Authorization", "Bearer " + token).contentType("application/json")
            .content("""
                {"displayName":"Nome atualizado","bio":"Piano e canto","username":"ignored","email":"ignored@h.local"}
                """))
            .andExpect(status().isOk()).andExpect(jsonPath("$.displayName").value("Nome atualizado"))
            .andExpect(jsonPath("$.teacher.bio").value("Piano e canto"))
            .andExpect(jsonPath("$.username").value(username))
            .andExpect(jsonPath("$.email").value(username + "@h.local"));
        mvc.perform(get("/account").header("Authorization", "Bearer " + token))
            .andExpect(jsonPath("$.teacher.bio").value("Piano e canto"));
    }

    @Test
    void studentCanUpdateNameAndBioIsIgnored() throws Exception {
        student("accountStudent");
        String studentToken = login("accountStudent" + suffix, "Student@123");
        mvc.perform(put("/account").header("Authorization", "Bearer " + studentToken).contentType("application/json")
            .content("""
                {"displayName":"Aluno atualizado","bio":"ignored"}
                """))
            .andExpect(status().isOk()).andExpect(jsonPath("$.displayName").value("Aluno atualizado"))
            .andExpect(jsonPath("$.teacher").value(nullValue()));
    }

    @Test
    void changesPasswordAndRevokesAllRefreshTokens() throws Exception {
        var first = loginResponse();
        var second = loginResponse();
        mvc.perform(put("/account/password").header("Authorization", "Bearer " + token)
            .contentType("application/json").content("""
                {"currentPassword":"Teach@1234","newPassword":"Changed@1234"}
                """))
            .andExpect(status().isNoContent());
        for (Cookie cookie : new Cookie[]{first, second}) {
            mvc.perform(post("/auth/refresh").cookie(cookie)).andExpect(status().isUnauthorized());
        }
        login(username, "Changed@1234");
        mvc.perform(post("/auth/login").contentType("application/json").content("""
            {"login":"%s","password":"Teach@1234"}
            """.formatted(username))).andExpect(status().isUnauthorized());
    }

    @Test
    void wrongCurrentPasswordAndSamePasswordAreDomainValidation() throws Exception {
        for (String body : new String[]{
            "{\"currentPassword\":\"wrong\",\"newPassword\":\"Changed@1234\"}",
            "{\"currentPassword\":\"" + "á".repeat(37) + "\",\"newPassword\":\"Changed@1234\"}",
            "{\"currentPassword\":\"Teach@1234\",\"newPassword\":\"Teach@1234\"}"}) {
            mvc.perform(put("/account/password").header("Authorization", "Bearer " + token)
                .contentType("application/json").content(body))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("DOMAIN_VALIDATION"));
        }
        login(username, "Teach@1234");
    }

    @Test
    void validatesNameBioAndPasswordLengthIncludingUtf8Bytes() throws Exception {
        for (String body : new String[]{"{\"displayName\":\" \"}",
            "{\"displayName\":\"" + "x".repeat(121) + "\"}",
            "{\"displayName\":\"Valid\",\"bio\":\"" + "x".repeat(501) + "\"}"}) {
            mvc.perform(put("/account").header("Authorization", "Bearer " + token)
                .contentType("application/json").content(body)).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION"));
        }
        for (String password : new String[]{"short", "á".repeat(37)}) {
            mvc.perform(put("/account/password").header("Authorization", "Bearer " + token)
                .contentType("application/json").content("""
                    {"currentPassword":"Teach@1234","newPassword":"%s"}
                    """.formatted(password))).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION"));
        }
    }

    @Test
    void requiresAuthenticationForAllAccountRoutes() throws Exception {
        mvc.perform(get("/account")).andExpect(status().isUnauthorized());
        mvc.perform(put("/account").contentType("application/json").content("{}"))
            .andExpect(status().isUnauthorized());
        mvc.perform(put("/account/password").contentType("application/json").content("{}"))
            .andExpect(status().isUnauthorized());
    }

    private Cookie loginResponse() throws Exception {
        return mvc.perform(post("/auth/login").contentType("application/json").content("""
            {"login":"%s","password":"Teach@1234"}
            """.formatted(username))).andExpect(status().isOk()).andReturn().getResponse().getCookie("refresh_token");
    }
}
