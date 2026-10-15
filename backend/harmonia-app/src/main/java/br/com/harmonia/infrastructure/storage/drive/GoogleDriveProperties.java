package br.com.harmonia.infrastructure.storage.drive;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.storage.google-drive")
public record GoogleDriveProperties(String folderId, String credentialsFile, String clientId,
                                    String clientSecret, String refreshToken) {
}
