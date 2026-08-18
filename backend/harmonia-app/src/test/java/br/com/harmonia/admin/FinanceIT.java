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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class FinanceIT {

    @Autowired MockMvc mvc;

    private String token() throws Exception {
        String body = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"admin\",\"password\":\"Admin@123\"}"))
            .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    @Test
    void admin_recordsTransactionsAndComputesBalance() throws Exception {
        String t = token();

        mvc.perform(post("/admin/finance/transactions").header("Authorization", "Bearer " + t)
                .contentType("application/json")
                .content("{\"type\":\"INCOME\",\"amount\":300.00,\"description\":\"Mensalidade\",\"date\":\"2026-06-01\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.type", is("INCOME")));

        mvc.perform(post("/admin/finance/transactions").header("Authorization", "Bearer " + t)
                .contentType("application/json")
                .content("{\"type\":\"EXPENSE\",\"amount\":100.00,\"description\":\"Aluguel\",\"date\":\"2026-06-01\"}"))
            .andExpect(status().isOk());

        mvc.perform(get("/admin/finance/balance").header("Authorization", "Bearer " + t))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.balance", is(200.0)));
    }

    @Test
    void finance_withoutToken_is401() throws Exception {
        mvc.perform(get("/admin/finance/transactions")).andExpect(status().isUnauthorized());
    }
}
