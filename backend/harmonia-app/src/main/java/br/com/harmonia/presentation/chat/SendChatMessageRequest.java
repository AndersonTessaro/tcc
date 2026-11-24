package br.com.harmonia.presentation.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendChatMessageRequest(@NotBlank @Size(min = 1, max = 2000) String body) {
    public SendChatMessageRequest {
        if (body != null) body = body.strip();
    }
}
