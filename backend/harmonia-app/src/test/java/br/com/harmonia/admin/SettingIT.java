package br.com.harmonia.admin;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class SettingIT {

    @Autowired MockMvc mvc;

    private String token() throws Exception {
        String body = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"admin\",\"password\":\"Admin@123\"}"))
            .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    @Test
    void admin_upsertsAndListsSettings() throws Exception {
        String t = token();

        mvc.perform(put("/admin/settings/school.name").header("Authorization", "Bearer " + t)
                .contentType("application/json")
                .content("{\"value\":\"Harmonia\",\"description\":\"Nome da escola\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.key", is("school.name")))
            .andExpect(jsonPath("$.value", is("Harmonia")));

        // update same key (upsert)
        mvc.perform(put("/admin/settings/school.name").header("Authorization", "Bearer " + t)
                .contentType("application/json")
                .content("{\"value\":\"Harmonia 2\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.value", is("Harmonia 2")));

        mvc.perform(get("/admin/settings").header("Authorization", "Bearer " + t))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].key", is("school.name")));
    }

    @Test
    void settings_withoutToken_is401() throws Exception {
        mvc.perform(get("/admin/settings")).andExpect(status().isUnauthorized());
    }
}
