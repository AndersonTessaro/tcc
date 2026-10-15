package br.com.harmonia.infrastructure.storage.drive;

import br.com.harmonia.infrastructure.storage.FileStoragePort;
import br.com.harmonia.infrastructure.storage.StorageUnavailableException;
import com.google.auth.oauth2.GoogleCredentials;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

public class GoogleDriveStorageAdapter implements FileStoragePort {
    static final String UPLOAD_URL =
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id";
    static final String FILE_URL = "https://www.googleapis.com/drive/v3/files/{id}";

    private final RestClient client;
    private final String folderId;

    public GoogleDriveStorageAdapter(RestClient.Builder builder, GoogleCredentials credentials, String folderId) {
        this.folderId = folderId;
        this.client = builder
            .requestInterceptor((request, body, execution) -> {
                request.getHeaders().setBearerAuth(accessToken(credentials));
                return execution.execute(request, body);
            })
            .build();
    }

    @Override
    public String save(String fileName, byte[] content) {
        return call(() -> {
            URI session = client.post().uri(UPLOAD_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Upload-Content-Type", MediaType.APPLICATION_OCTET_STREAM_VALUE)
                .header("X-Upload-Content-Length", String.valueOf(content.length))
                .body(Map.of("name", FileStoragePort.uniqueName(fileName), "parents", List.of(folderId)))
                .retrieve().toBodilessEntity().getHeaders().getLocation();
            if (session == null) throw new RestClientException("Drive upload session without Location");
            DriveFile file = client.put().uri(session)
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(content)
                .retrieve().body(DriveFile.class);
            if (file == null || file.id() == null) throw new RestClientException("Drive upload without file id");
            return file.id();
        });
    }

    @Override
    public byte[] read(String storagePath) {
        return call(() -> client.get().uri(FILE_URL + "?alt=media&supportsAllDrives=true", storagePath)
            .retrieve().body(byte[].class));
    }

    @Override
    public void delete(String storagePath) {
        call(() -> client.delete().uri(FILE_URL + "?supportsAllDrives=true", storagePath)
            .retrieve()
            .onStatus(status -> status.isSameCodeAs(HttpStatus.NOT_FOUND), (request, response) -> {})
            .toBodilessEntity());
    }

    private static String accessToken(GoogleCredentials credentials) throws IOException {
        credentials.refreshIfExpired();
        return credentials.getAccessToken().getTokenValue();
    }

    private static <T> T call(Supplier<T> request) {
        try {
            return request.get();
        } catch (RestClientException e) {
            throw new StorageUnavailableException(e);
        }
    }

    public record DriveFile(String id) {}
}
