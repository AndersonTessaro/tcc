package br.com.harmonia.admin;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AdminRegistrationIT {

    @Autowired MockMvc mvc;

    private String token() throws Exception {
        String body = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"admin\",\"password\":\"Admin@123\"}"))
            .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    private String postId(String token, String path, String json) throws Exception {
        String body = mvc.perform(post(path).header("Authorization", "Bearer " + token)
                .contentType("application/json").content(json))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id", notNullValue()))
            .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    @Test
    void admin_seedsFullChain() throws Exception {
        String t = token();
        String inst = postId(t, "/admin/instruments", "{\"name\":\"Acoustic Guitar\"}");
        String teacher = postId(t, "/admin/teachers",
            "{\"username\":\"teacher1\",\"email\":\"teacher1@h.local\",\"password\":\"Teach@1234\",\"name\":\"Teacher One\"}");
        String student = postId(t, "/admin/students",
            "{\"username\":\"student1\",\"email\":\"student1@h.local\",\"password\":\"Student@123\",\"name\":\"Student One\"}");
        postId(t, "/admin/enrollments",
            "{\"studentId\":\"" + student + "\",\"teacherId\":\"" + teacher + "\",\"instrumentId\":\"" + inst + "\"}");
    }

    @Test
    void admin_endpoint_withoutToken_is401() throws Exception {
        mvc.perform(get("/admin/students")).andExpect(status().isUnauthorized());
    }
}
