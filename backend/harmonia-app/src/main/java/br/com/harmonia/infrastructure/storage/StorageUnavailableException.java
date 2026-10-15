package br.com.harmonia.infrastructure.storage;

public class StorageUnavailableException extends RuntimeException {
    public StorageUnavailableException(Throwable cause) {
        super("File storage is unavailable", cause);
    }
}
