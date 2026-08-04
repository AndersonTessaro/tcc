package br.com.harmonia.admin;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
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

    private String token(String login, String password) throws Exception {
        String body = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"" + login + "\",\"password\":\"" + password + "\"}"))
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

        // base listings
        mvc.perform(get("/admin/security/users").header("Authorization", "Bearer " + t))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].username", notNullValue()));
        getOk(t, "/admin/security/roles");
        String permsBody = getOk(t, "/admin/security/permissions");
        List<Integer> permIds = JsonPath.read(permsBody, "$[*].id");

        // create role MONITOR
        String roleBody = mvc.perform(post("/admin/security/roles").header("Authorization", "Bearer " + t)
                .contentType("application/json")
                .content("{\"name\":\"MONITOR\",\"description\":\"Class monitor\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id", notNullValue()))
            .andReturn().getResponse().getContentAsString();
        int roleId = JsonPath.read(roleBody, "$.id");

        // set role permissions
        int p0 = permIds.get(0);
        int p1 = permIds.get(1);
        mvc.perform(put("/admin/security/roles/" + roleId + "/permissions")
                .header("Authorization", "Bearer " + t).contentType("application/json")
                .content("{\"permissionIds\":[" + p0 + "," + p1 + "]}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.permissions.length()", greaterThan(0)));

        // create a student; find the User (auth_user) id by username
        mvc.perform(post("/admin/students").header("Authorization", "Bearer " + t)
                .contentType("application/json")
                .content("{\"username\":\"mon1\",\"email\":\"mon1@h.local\",\"password\":\"Mon@1234\",\"name\":\"Monitor One\"}"))
            .andExpect(status().isOk());
        String usersBody = getOk(t, "/admin/security/users");
        List<String> ids = JsonPath.read(usersBody, "$[?(@.username=='mon1')].id");
        String userId = ids.get(0);

        // assign role MONITOR to the user
        mvc.perform(put("/admin/security/users/" + userId + "/roles")
                .header("Authorization", "Bearer " + t).contentType("application/json")
                .content("{\"roleIds\":[" + roleId + "]}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.roles[0].name", notNullValue()));

        // capture mon1's refresh token before deactivation (H-01: must be revoked)
        Cookie mon1Refresh = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"mon1\",\"password\":\"Mon@1234\"}"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getCookie("refresh_token");

        // deactivate user
        mvc.perform(put("/admin/security/users/" + userId + "/status")
                .header("Authorization", "Bearer " + t).contentType("application/json")
                .content("{\"active\":false}"))
            .andExpect(status().isOk());

        // H-01: refresh token issued before deactivation must now be revoked
        mvc.perform(post("/auth/refresh").cookie(mon1Refresh))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void resetPassword_revokesExistingRefreshTokens() throws Exception {
        String t = token("admin", "Admin@123");
        mvc.perform(post("/admin/students").header("Authorization", "Bearer " + t)
                .contentType("application/json")
                .content("{\"username\":\"resetpwuser\",\"email\":\"resetpwuser@h.local\",\"password\":\"Pw@12345\",\"name\":\"Reset Pw User\"}"))
            .andExpect(status().isOk());
        String usersBody = getOk(t, "/admin/security/users");
        List<String> ids = JsonPath.read(usersBody, "$[?(@.username=='resetpwuser')].id");
        String userId = ids.get(0);

        Cookie oldRefresh = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"resetpwuser\",\"password\":\"Pw@12345\"}"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getCookie("refresh_token");

        mvc.perform(put("/admin/security/users/" + userId + "/password")
                .header("Authorization", "Bearer " + t).contentType("application/json")
                .content("{\"newPassword\":\"NewPw@6789\"}"))
            .andExpect(status().isOk());

        // H-01: refresh token issued before an admin password reset must now be revoked
        mvc.perform(post("/auth/refresh").cookie(oldRefresh))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void nonPrivilegedUser_cannotAccessSecurityAdmin() throws Exception {
        String t = token("admin", "Admin@123");
        mvc.perform(post("/admin/students").header("Authorization", "Bearer " + t)
                .contentType("application/json")
                .content("{\"username\":\"noperm\",\"email\":\"noperm@h.local\",\"password\":\"Nop@1234\",\"name\":\"No Perm\"}"))
            .andExpect(status().isOk());

        String studentToken = token("noperm", "Nop@1234");
        mvc.perform(get("/admin/security/users").header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isForbidden());
    }

    @Test
    void securityAdmin_withoutToken_is401() throws Exception {
        mvc.perform(get("/admin/security/roles")).andExpect(status().isUnauthorized());
    }
}
