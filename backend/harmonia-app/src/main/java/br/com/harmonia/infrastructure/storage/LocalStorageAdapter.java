package br.com.harmonia.infrastructure.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Component
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "local", matchIfMissing = true)
public class LocalStorageAdapter implements FileStoragePort {
    private final Path root;

    public LocalStorageAdapter(@Value("${app.storage.local-dir:./storage}") String dir) throws IOException {
        this.root = Path.of(dir);
        Files.createDirectories(root);
    }

    @Override
    public String save(String fileName, InputStream content, long size) {
        try {
            String key = FileStoragePort.uniqueName(fileName);
            try {
                Files.copy(content, root.resolve(key));
            } catch (IOException e) {
                Files.deleteIfExists(root.resolve(key));
                throw e;
            }
            return key;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public byte[] read(String storagePath) {
        try {
            return Files.readAllBytes(root.resolve(storagePath));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public void delete(String storagePath) {
        try {
            Files.deleteIfExists(root.resolve(storagePath));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
