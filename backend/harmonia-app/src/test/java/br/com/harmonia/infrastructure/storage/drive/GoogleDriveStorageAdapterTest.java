package br.com.harmonia.infrastructure.storage.drive;

import br.com.harmonia.infrastructure.storage.StorageUnavailableException;
import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.endsWith;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GoogleDriveStorageAdapterTest {
    private static final String FILE = "https://www.googleapis.com/drive/v3/files/drive-id";

    private MockRestServiceServer server;
    private GoogleDriveStorageAdapter adapter;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        var token = new AccessToken("test-token", Date.from(Instant.now().plus(1, ChronoUnit.HOURS)));
        adapter = new GoogleDriveStorageAdapter(builder, GoogleCredentials.create(token), "folder-1");
    }

    @Test
    void savesWithResumableUploadIntoTheFolderAndReturnsTheDriveId() {
        URI session = URI.create("https://www.googleapis.com/upload/drive/v3/files?upload_id=session-1");
        server.expect(requestTo(GoogleDriveStorageAdapter.UPLOAD_URL))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header("Authorization", "Bearer test-token"))
            .andExpect(header("X-Upload-Content-Type", "application/octet-stream"))
            .andExpect(header("X-Upload-Content-Length", "3"))
            .andExpect(jsonPath("$.parents[0]").value("folder-1"))
            .andExpect(jsonPath("$.name", endsWith("_aula_1.pdf")))
            .andRespond(withSuccess().location(session));
        server.expect(requestTo(session))
            .andExpect(method(HttpMethod.PUT))
            .andExpect(header("Authorization", "Bearer test-token"))
            .andExpect(content().bytes(new byte[] {1, 2, 3}))
            .andRespond(withSuccess("{\"id\":\"drive-id\"}", MediaType.APPLICATION_JSON));

        assertThat(adapter.save("aula 1.pdf", new byte[] {1, 2, 3})).isEqualTo("drive-id");
        server.verify();
    }

    @Test
    void readsTheFileContent() {
        server.expect(requestTo(FILE + "?alt=media&supportsAllDrives=true"))
            .andExpect(method(HttpMethod.GET))
            .andExpect(header("Authorization", "Bearer test-token"))
            .andRespond(withSuccess(new byte[] {7, 8}, MediaType.APPLICATION_OCTET_STREAM));

        assertThat(adapter.read("drive-id")).containsExactly(7, 8);
    }

    @Test
    void deletingAMissingFileIsIgnored() {
        server.expect(requestTo(FILE + "?supportsAllDrives=true"))
            .andExpect(method(HttpMethod.DELETE))
            .andRespond(withStatus(HttpStatus.NOT_FOUND));

        assertThatCode(() -> adapter.delete("drive-id")).doesNotThrowAnyException();
        server.verify();
    }

    @Test
    void forbiddenReadBecomesStorageUnavailableWithoutLeakingTheBody() {
        server.expect(requestTo(FILE + "?alt=media&supportsAllDrives=true"))
            .andRespond(withStatus(HttpStatus.FORBIDDEN).body("quota secret detail"));

        assertThatThrownBy(() -> adapter.read("drive-id"))
            .isInstanceOf(StorageUnavailableException.class)
            .hasMessage("File storage is unavailable");
    }

    @Test
    void serverErrorOnUploadBecomesStorageUnavailable() {
        server.expect(requestTo(GoogleDriveStorageAdapter.UPLOAD_URL))
            .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        assertThatThrownBy(() -> adapter.save("aula.pdf", new byte[] {1}))
            .isInstanceOf(StorageUnavailableException.class);
    }

    @Test
    void deleteFailureOtherThanNotFoundBecomesStorageUnavailable() {
        server.expect(requestTo(FILE + "?supportsAllDrives=true"))
            .andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        assertThatThrownBy(() -> adapter.delete("drive-id"))
            .isInstanceOf(StorageUnavailableException.class);
    }
}
