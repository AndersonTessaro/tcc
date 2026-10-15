package br.com.harmonia.infrastructure.storage.drive;

import br.com.harmonia.infrastructure.storage.FileStoragePort;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
import com.google.auth.oauth2.UserCredentials;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.stream.Stream;

@Configuration
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "google-drive")
@EnableConfigurationProperties(GoogleDriveProperties.class)
public class GoogleDriveConfig {
    static final String DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

    @Bean
    GoogleCredentials googleDriveCredentials(GoogleDriveProperties properties) throws IOException {
        if (isBlank(properties.folderId())) {
            throw new IllegalStateException("Google Drive storage requires APP_STORAGE_GOOGLE_DRIVE_FOLDER_ID");
        }
        if (!isBlank(properties.credentialsFile())) {
            try (InputStream in = Files.newInputStream(Path.of(properties.credentialsFile()))) {
                return ServiceAccountCredentials.fromStream(in).createScoped(DRIVE_SCOPE);
            }
        }
        if (Stream.of(properties.clientId(), properties.clientSecret(), properties.refreshToken())
                .noneMatch(GoogleDriveConfig::isBlank)) {
            return UserCredentials.newBuilder()
                .setClientId(properties.clientId())
                .setClientSecret(properties.clientSecret())
                .setRefreshToken(properties.refreshToken())
                .build();
        }
        throw new IllegalStateException("Google Drive storage requires APP_STORAGE_GOOGLE_DRIVE_CREDENTIALS_FILE "
            + "or APP_STORAGE_GOOGLE_DRIVE_CLIENT_ID, _CLIENT_SECRET and _REFRESH_TOKEN");
    }

    @Bean
    FileStoragePort googleDriveStorage(GoogleDriveProperties properties, GoogleCredentials googleDriveCredentials) {
        var requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        requestFactory.setReadTimeout(Duration.ofSeconds(120));
        return new GoogleDriveStorageAdapter(RestClient.builder().requestFactory(requestFactory),
            googleDriveCredentials, properties.folderId());
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
