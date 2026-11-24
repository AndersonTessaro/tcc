package br.com.harmonia.presentation.response;

import br.com.harmonia.application.chat.ChatUseCase.Conversation;

import java.time.LocalDateTime;
import java.util.UUID;

public record TeacherChatResponse(UUID studentId, String studentName, String lastMessage,
                                  LocalDateTime lastMessageAt, long unread) {
    public static TeacherChatResponse from(Conversation conversation) {
        return new TeacherChatResponse(conversation.profileId(), conversation.profileName(),
            conversation.lastMessage(), conversation.lastMessageAt(), conversation.unread());
    }
}
