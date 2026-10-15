package br.com.harmonia.presentation.error;

import br.com.harmonia.infrastructure.storage.StorageUnavailableException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {
    @Test
    void storageFailureBecomes503WithoutProviderDetails() {
        var response = new GlobalExceptionHandler()
            .storageUnavailable(new StorageUnavailableException(new RuntimeException("drive quota secret")));

        assertThat(response.getStatusCode().value()).isEqualTo(503);
        assertThat(response.getBody().code()).isEqualTo("STORAGE_UNAVAILABLE");
        assertThat(response.getBody().message()).isEqualTo("File storage is unavailable");
    }
}
