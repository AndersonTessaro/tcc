package br.com.harmonia.account;

import br.com.harmonia.teacher.MoreMenuITSupport;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class TermsIT extends MoreMenuITSupport {
    private String token;

    @BeforeEach
    void setUp() throws Exception {
        student("terms");
        token = login("terms" + suffix, "Student@123");
    }

    @Test
    void anyoneReadsTheCurrentTerms() throws Exception {
        mvc.perform(get("/terms"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.version").isNotEmpty())
            .andExpect(jsonPath("$.text", containsString("Sonetto")));
    }

    @Test
    void acceptingTheCurrentVersionIsReflectedInMe() throws Exception {
        mvc.perform(get("/auth/me").header("Authorization", "Bearer " + token))
            .andExpect(jsonPath("$.termsAccepted").value(false));
        String version = JsonPath.read(mvc.perform(get("/terms")).andReturn().getResponse().getContentAsString(), "$.version");

        mvc.perform(post("/account/terms").header("Authorization", "Bearer " + token).contentType("application/json")
                .content("{\"version\":\"" + version + "\"}"))
            .andExpect(status().isNoContent());

        mvc.perform(get("/auth/me").header("Authorization", "Bearer " + token))
            .andExpect(jsonPath("$.termsAccepted").value(true));
    }

    @Test
    void rejectsAcceptingAnOutdatedVersion() throws Exception {
        mvc.perform(post("/account/terms").header("Authorization", "Bearer " + token).contentType("application/json")
                .content("{\"version\":\"1999-01-01\"}"))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("DOMAIN_VALIDATION"));
        mvc.perform(get("/auth/me").header("Authorization", "Bearer " + token))
            .andExpect(jsonPath("$.termsAccepted").value(false));
    }

    @Test
    void acceptingRequiresAuthentication() throws Exception {
        mvc.perform(post("/account/terms").contentType("application/json").content("{\"version\":\"x\"}"))
            .andExpect(status().isUnauthorized());
    }
}
