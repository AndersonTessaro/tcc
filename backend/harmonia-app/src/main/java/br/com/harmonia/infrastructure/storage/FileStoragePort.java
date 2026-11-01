package br.com.harmonia.infrastructure.storage;

import java.util.UUID;
import java.io.InputStream;
import java.io.ByteArrayInputStream;

public interface FileStoragePort {
    int MAX_KEY_NAME_LENGTH = 218;

    default String save(String fileName, byte[] content) {
        return save(fileName, new ByteArrayInputStream(content), content.length);
    }
    String save(String fileName, InputStream content, long size);
    byte[] read(String storagePath);
    void delete(String storagePath);

    static String uniqueName(String fileName) {
        String safe = (fileName == null ? "file" : fileName).replaceAll("[^A-Za-z0-9._-]", "_");
        return UUID.randomUUID() + "_" + safe.substring(Math.max(0, safe.length() - MAX_KEY_NAME_LENGTH));
    }
}
