package br.com.harmonia.infrastructure.storage.drive;

import br.com.harmonia.infrastructure.storage.FileStoragePort;
import br.com.harmonia.infrastructure.storage.LocalStorageAdapter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class GoogleDriveConfigTest {
    @TempDir
    Path storageDir;

    private ApplicationContextRunner runner() {
        return new ApplicationContextRunner()
            .withUserConfiguration(GoogleDriveConfig.class, LocalStorageAdapter.class)
            .withPropertyValues("app.storage.local-dir=" + storageDir);
    }

    @Test
    void localStorageIsTheDefault() {
        runner().run(context -> {
            assertThat(context).hasSingleBean(FileStoragePort.class);
            assertThat(context.getBean(FileStoragePort.class)).isInstanceOf(LocalStorageAdapter.class);
        });
    }

    @Test
    void googleDriveWithOauthRefreshTokenReplacesLocalStorage() {
        runner().withPropertyValues("app.storage.provider=google-drive",
                "app.storage.google-drive.folder-id=folder-1",
                "app.storage.google-drive.client-id=client",
                "app.storage.google-drive.client-secret=secret",
                "app.storage.google-drive.refresh-token=refresh")
            .run(context -> {
                assertThat(context).hasSingleBean(FileStoragePort.class);
                assertThat(context.getBean(FileStoragePort.class)).isInstanceOf(GoogleDriveStorageAdapter.class);
            });
    }

    @Test
    void googleDriveWithoutFolderFailsAtStartup() {
        runner().withPropertyValues("app.storage.provider=google-drive",
                "app.storage.google-drive.client-id=client",
                "app.storage.google-drive.client-secret=secret",
                "app.storage.google-drive.refresh-token=refresh")
            .run(context -> assertThat(context).getFailure()
                .hasRootCauseMessage("Google Drive storage requires APP_STORAGE_GOOGLE_DRIVE_FOLDER_ID"));
    }

    @Test
    void googleDriveWithoutCredentialsFailsAtStartup() {
        runner().withPropertyValues("app.storage.provider=google-drive",
                "app.storage.google-drive.folder-id=folder-1",
                "app.storage.google-drive.client-id=client")
            .run(context -> assertThat(context).getFailure()
                .rootCause().hasMessageContaining("APP_STORAGE_GOOGLE_DRIVE_CREDENTIALS_FILE"));
    }
}
