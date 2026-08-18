package br.com.harmonia.infrastructure.storage;

public interface FileStoragePort {
    /** Saves bytes and returns the storage_path. */
    String save(String fileName, byte[] content);
    byte[] read(String storagePath);
}
