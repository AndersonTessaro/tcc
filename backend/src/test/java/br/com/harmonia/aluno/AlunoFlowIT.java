package br.com.harmonia.aluno;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AlunoFlowIT {

    @Autowired MockMvc mvc;

    private String login(String user, String senha) throws Exception {
        String body = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"" + user + "\",\"senha\":\"" + senha + "\"}"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    private String postId(String token, String path, String json) throws Exception {
        String body = mvc.perform(post(path).header("Authorization", "Bearer " + token)
                .contentType("application/json").content(json))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    @Test
    void aluno_pratica_meta_dashboard() throws Exception {
        String admin = login("admin", "Admin@123");
        String inst = postId(admin, "/admin/instrumentos", "{\"nome\":\"Piano\"}");
        String prof = postId(admin, "/admin/professores",
            "{\"username\":\"profA\",\"email\":\"profA@h.local\",\"senha\":\"Prof@1234\",\"nome\":\"Prof A\"}");
        String aluno = postId(admin, "/admin/alunos",
            "{\"username\":\"alunoA\",\"email\":\"alunoA@h.local\",\"senha\":\"Aluno@123\",\"nome\":\"Aluno A\"}");
        postId(admin, "/admin/matriculas",
            "{\"alunoId\":\"" + aluno + "\",\"professorId\":\"" + prof + "\",\"instrumentoId\":\"" + inst + "\"}");

        String t = login("alunoA", "Aluno@123");

        // 1ª prática 60 min -> xp 60, nivel 1
        mvc.perform(post("/me/praticas").header("Authorization", "Bearer " + t)
                .contentType("application/json").content("{\"duracaoMin\":60}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.xpTotal", is(60)))
            .andExpect(jsonPath("$.nivel", is(1)));

        // 2ª prática 120 min mesmo dia -> xp 180, nivel 2
        mvc.perform(post("/me/praticas").header("Authorization", "Bearer " + t)
                .contentType("application/json").content("{\"duracaoMin\":120}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.xpTotal", is(180)))
            .andExpect(jsonPath("$.nivel", is(2)));

        // dashboard reflete
        mvc.perform(get("/me/dashboard").header("Authorization", "Bearer " + t))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.xp", is(180)))
            .andExpect(jsonPath("$.nivel", is(2)))
            .andExpect(jsonPath("$.praticaSemanalMin", is(180)));

        // meta: criar (alvo 2) -> concluir
        String meta = postId(t, "/me/metas",
            "{\"titulo\":\"Estudar\",\"tipo\":\"AULAS\",\"alvo\":2}");
        mvc.perform(put("/me/metas/" + meta + "?progresso=2").header("Authorization", "Bearer " + t))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status", is("CONCLUIDA")));

        // aulas próximas (vazio, sem aula registrada) -> 200
        mvc.perform(get("/me/aulas?status=proximas").header("Authorization", "Bearer " + t))
            .andExpect(status().isOk());
    }
}
