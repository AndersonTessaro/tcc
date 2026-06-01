package br.com.harmonia.professor;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.UUID;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ProfessorFlowIT {

    @Autowired MockMvc mvc;

    private String login(String user, String senha) throws Exception {
        String body = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"" + user + "\",\"senha\":\"" + senha + "\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    private String postId(String token, String path, String json) throws Exception {
        String body = mvc.perform(post(path).header("Authorization", "Bearer " + token)
                .contentType("application/json").content(json))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    @Test
    void professor_aula_frequencia_agenda_ownership() throws Exception {
        String admin = login("admin", "Admin@123");
        String inst = postId(admin, "/admin/instrumentos", "{\"nome\":\"Guitarra\"}");
        String prof = postId(admin, "/admin/professores",
            "{\"username\":\"profP\",\"email\":\"profP@h.local\",\"senha\":\"Prof@1234\",\"nome\":\"Prof P\"}");
        String aluno = postId(admin, "/admin/alunos",
            "{\"username\":\"alunoP\",\"email\":\"alunoP@h.local\",\"senha\":\"Aluno@123\",\"nome\":\"Aluno P\"}");
        String matricula = postId(admin, "/admin/matriculas",
            "{\"alunoId\":\"" + aluno + "\",\"professorId\":\"" + prof + "\",\"instrumentoId\":\"" + inst + "\"}");

        String t = login("profP", "Prof@1234");
        String hoje = LocalDate.now().toString();

        // alunos vinculados
        mvc.perform(get("/professor/alunos").header("Authorization", "Bearer " + t))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()", greaterThanOrEqualTo(1)));

        // nova aula
        String aulaBody = mvc.perform(post("/professor/aulas").header("Authorization", "Bearer " + t)
                .contentType("application/json")
                .content("{\"matriculaId\":\"" + matricula + "\",\"data\":\"" + hoje
                    + "\",\"horaInicio\":\"10:00\",\"conteudo\":\"Escala\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String aulaId = JsonPath.read(aulaBody, "$.id");

        // frequência PRESENTE
        mvc.perform(post("/professor/aulas/" + aulaId + "/frequencia").header("Authorization", "Bearer " + t)
                .contentType("application/json").content("{\"status\":\"PRESENTE\"}"))
            .andExpect(status().isOk());

        // agenda do dia contém a aula
        mvc.perform(get("/professor/agenda?data=" + hoje).header("Authorization", "Bearer " + t))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()", greaterThanOrEqualTo(1)));

        // ownership: aluno não vinculado -> 403
        mvc.perform(get("/professor/alunos/" + UUID.randomUUID()).header("Authorization", "Bearer " + t))
            .andExpect(status().isForbidden());
    }
}
