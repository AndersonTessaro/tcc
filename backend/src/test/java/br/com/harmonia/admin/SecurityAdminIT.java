package br.com.harmonia.admin;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class SecurityAdminIT {

    @Autowired MockMvc mvc;

    private String token(String login, String senha) throws Exception {
        String body = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"" + login + "\",\"senha\":\"" + senha + "\"}"))
            .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    private String getOk(String token, String path) throws Exception {
        return mvc.perform(get(path).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
    }

    @Test
    void admin_managesRolesUsersAndPermissions() throws Exception {
        String t = token("admin", "Admin@123");

        // listagens base
        mvc.perform(get("/admin/security/usuarios").header("Authorization", "Bearer " + t))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].username", notNullValue()));
        getOk(t, "/admin/security/roles");
        String permsBody = getOk(t, "/admin/security/permissoes");
        List<Integer> permIds = JsonPath.read(permsBody, "$[*].id");

        // criar role MONITOR
        String roleBody = mvc.perform(post("/admin/security/roles").header("Authorization", "Bearer " + t)
                .contentType("application/json")
                .content("{\"name\":\"MONITOR\",\"description\":\"Monitor de turma\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id", notNullValue()))
            .andReturn().getResponse().getContentAsString();
        int roleId = JsonPath.read(roleBody, "$.id");

        // setar permissões da role
        int p0 = permIds.get(0);
        int p1 = permIds.get(1);
        mvc.perform(put("/admin/security/roles/" + roleId + "/permissoes")
                .header("Authorization", "Bearer " + t).contentType("application/json")
                .content("{\"permissionIds\":[" + p0 + "," + p1 + "]}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.permissions.length()", greaterThan(0)));

        // criar um aluno; descobrir o id do Usuario (auth_user) pelo username
        mvc.perform(post("/admin/alunos").header("Authorization", "Bearer " + t)
                .contentType("application/json")
                .content("{\"username\":\"mon1\",\"email\":\"mon1@h.local\",\"senha\":\"Mon@1234\",\"nome\":\"Monitor Um\"}"))
            .andExpect(status().isOk());
        String usuariosBody = getOk(t, "/admin/security/usuarios");
        List<String> ids = JsonPath.read(usuariosBody, "$[?(@.username=='mon1')].id");
        String userId = ids.get(0);

        // atribuir a role MONITOR ao usuário
        mvc.perform(put("/admin/security/usuarios/" + userId + "/roles")
                .header("Authorization", "Bearer " + t).contentType("application/json")
                .content("{\"roleIds\":[" + roleId + "]}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.roles[0].name", notNullValue()));

        // desativar usuário
        mvc.perform(put("/admin/security/usuarios/" + userId + "/status")
                .header("Authorization", "Bearer " + t).contentType("application/json")
                .content("{\"ativo\":false}"))
            .andExpect(status().isOk());
    }

    @Test
    void nonPrivilegedUser_cannotAccessSecurityAdmin() throws Exception {
        String t = token("admin", "Admin@123");
        mvc.perform(post("/admin/alunos").header("Authorization", "Bearer " + t)
                .contentType("application/json")
                .content("{\"username\":\"semperm\",\"email\":\"semperm@h.local\",\"senha\":\"Sem@1234\",\"nome\":\"Sem Perm\"}"))
            .andExpect(status().isOk());

        String alunoToken = token("semperm", "Sem@1234");
        mvc.perform(get("/admin/security/usuarios").header("Authorization", "Bearer " + alunoToken))
            .andExpect(status().isForbidden());
    }

    @Test
    void securityAdmin_withoutToken_is401() throws Exception {
        mvc.perform(get("/admin/security/roles")).andExpect(status().isUnauthorized());
    }
}
