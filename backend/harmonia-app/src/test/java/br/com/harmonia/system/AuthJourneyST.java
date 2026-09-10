package br.com.harmonia.system;

import br.com.harmonia.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * System test: boots the whole application on a real port, talks to it over a real
 * HTTP socket (no MockMvc, no Spring test client) against a real PostgreSQL container.
 *
 * <p>Runs only under the {@code system-tests} Maven profile, i.e. the system stage of the
 * CI pipeline, after the unit and integration stages are green.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class AuthJourneyST {

    private static final String ADMIN_LOGIN_BODY = "{\"login\":\"admin\",\"password\":\"Admin@123\"}";

    @LocalServerPort
    int port;

    private final HttpClient http = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build();

    @Test
    void adminLogsInAndReadsOwnProfileOverRealHttp() throws Exception {
        HttpResponse<String> login = send(HttpRequest.newBuilder(uri("/auth/login"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(ADMIN_LOGIN_BODY)));

        assertThat(login.statusCode()).isEqualTo(200);
        assertThat(login.headers().allValues("Set-Cookie"))
            .withFailMessage("login must hand back the refresh_token cookie")
            .anyMatch(cookie -> cookie.startsWith("refresh_token="));

        String accessToken = JsonPath.read(login.body(), "$.accessToken");
        assertThat(accessToken).isNotBlank();

        HttpResponse<String> me = send(HttpRequest.newBuilder(uri("/auth/me"))
            .header("Authorization", "Bearer " + accessToken)
            .GET());

        assertThat(me.statusCode()).isEqualTo(200);
        assertThat(JsonPath.<String>read(me.body(), "$.username")).isEqualTo("admin");
        assertThat(JsonPath.<java.util.List<String>>read(me.body(), "$.authorities")).contains("ROLE_ADMIN");
    }

    @Test
    void protectedEndpointRejectsRequestWithoutToken() throws Exception {
        HttpResponse<String> me = send(HttpRequest.newBuilder(uri("/auth/me")).GET());

        assertThat(me.statusCode()).isEqualTo(401);
    }

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }

    private HttpResponse<String> send(HttpRequest.Builder request) throws Exception {
        return http.send(request.timeout(Duration.ofSeconds(30)).build(), HttpResponse.BodyHandlers.ofString());
    }
}
