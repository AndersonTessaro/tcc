package br.com.harmonia.application.admin.port;

import java.util.List;
import java.util.UUID;

public interface UserStorageRepository {
    List<String> pathsForUser(UUID userId);
}
