package br.com.harmonia.presentation.response;

import br.com.harmonia.application.chat.ChatUseCase.Message;

import java.time.LocalDateTime;
import java.util.UUID;

public record ChatMessageResponse(UUID id, String body, LocalDateTime sentAt, boolean mine) {
    public static ChatMessageResponse from(Message message) {
        return new ChatMessageResponse(message.id(), message.body(), message.sentAt(), message.mine());
    }
}
