package br.com.harmonia.application.storage;

import br.com.harmonia.infrastructure.storage.FileStoragePort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

public final class StorageTransactions {
    private static final Logger log = LoggerFactory.getLogger(StorageTransactions.class);

    private StorageTransactions() {}

    public static void deleteOnRollback(FileStoragePort storage, String path) {
        registerDeletion(storage, path, false);
    }

    public static void deleteAfterCommit(FileStoragePort storage, String path) {
        registerDeletion(storage, path, true);
    }

    private static void registerDeletion(FileStoragePort storage, String path, boolean committed) {
        if (path == null) return;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if ((status == STATUS_COMMITTED) == committed) {
                    try {
                        storage.delete(path);
                    } catch (RuntimeException e) {
                        log.warn("Failed to delete stored file {} after transaction completion", path, e);
                    }
                }
            }
        });
    }
}
