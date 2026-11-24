package br.com.harmonia.presentation.response;

import br.com.harmonia.application.chat.ChatUseCase.Conversation;

import java.time.LocalDateTime;
import java.util.UUID;

public record StudentChatResponse(UUID teacherId, String teacherName, String lastMessage,
                                  LocalDateTime lastMessageAt, long unread) {
    public static StudentChatResponse from(Conversation conversation) {
        return new StudentChatResponse(conversation.profileId(), conversation.profileName(),
            conversation.lastMessage(), conversation.lastMessageAt(), conversation.unread());
    }
}
