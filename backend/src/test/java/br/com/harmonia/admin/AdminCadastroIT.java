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
class AdminCadastroIT {

    @Autowired MockMvc mvc;

    private String token() throws Exception {
        String body = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"admin\",\"senha\":\"Admin@123\"}"))
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
        String inst = postId(t, "/admin/instrumentos", "{\"nome\":\"Violão\"}");
        String prof = postId(t, "/admin/professores",
            "{\"username\":\"prof1\",\"email\":\"prof1@h.local\",\"senha\":\"Prof@1234\",\"nome\":\"Prof Um\"}");
        String aluno = postId(t, "/admin/alunos",
            "{\"username\":\"aluno1\",\"email\":\"aluno1@h.local\",\"senha\":\"Aluno@123\",\"nome\":\"Aluno Um\"}");
        postId(t, "/admin/matriculas",
            "{\"alunoId\":\"" + aluno + "\",\"professorId\":\"" + prof + "\",\"instrumentoId\":\"" + inst + "\"}");
    }

    @Test
    void admin_endpoint_withoutToken_is401() throws Exception {
        mvc.perform(get("/admin/alunos")).andExpect(status().isUnauthorized());
    }
}
