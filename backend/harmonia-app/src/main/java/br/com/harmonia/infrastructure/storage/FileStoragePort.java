package br.com.harmonia.infrastructure.storage;

import java.util.UUID;

public interface FileStoragePort {
    int MAX_KEY_NAME_LENGTH = 218;

    /** Saves bytes and returns the storage_path. */
    String save(String fileName, byte[] content);
    byte[] read(String storagePath);
    void delete(String storagePath);

    static String uniqueName(String fileName) {
        String safe = (fileName == null ? "file" : fileName).replaceAll("[^A-Za-z0-9._-]", "_");
        return UUID.randomUUID() + "_" + safe.substring(Math.max(0, safe.length() - MAX_KEY_NAME_LENGTH));
    }
}
