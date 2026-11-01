package br.com.harmonia;

import com.jayway.jsonpath.JsonPath;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

public final class SchoolTestSupport {
    private SchoolTestSupport() {}

    public static RequestPostProcessor school(MockMvc mvc) {
        return request -> {
            if (!List.of("/admin/students", "/admin/teachers", "/admin/finance/transactions").contains(request.getRequestURI()))
                return request;
            try {
                var result = mvc.perform(get("/admin/schools")
                        .header("Authorization", request.getHeader("Authorization"))).andReturn().getResponse();
                if (result.getStatus() != 200) return request;
                String response = result.getContentAsString();
                List<String> ids = JsonPath.read(response, "$[?(@.name == 'Escola Harmonia')].id");
                String body = JsonPath.parse(new String(request.getContentAsByteArray(), StandardCharsets.UTF_8))
                    .put("$", "schoolId", ids.getFirst()).jsonString();
                request.setContent(body.getBytes(StandardCharsets.UTF_8));
                return request;
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
        };
    }
}
