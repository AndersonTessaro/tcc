package br.com.harmonia.infrastructure.storage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class LocalStorageAdapterTest {
    @TempDir Path directory;

    @Test
    void save_longDisplayName_preservesBytesAndExtensionWithinFilesystemLimit() throws Exception {
        var storage = new LocalStorageAdapter(directory.toString());
        String displayName = "x".repeat(251) + ".pdf";
        byte[] content = {'%', 'P', 'D', 'F'};

        String key = storage.save(displayName, content);

        assertThat(key).hasSize(255).endsWith(".pdf");
        assertThat(storage.read(key)).containsExactly(content);
        storage.delete(key);
        assertThat(Files.exists(directory.resolve(key))).isFalse();
    }
}
