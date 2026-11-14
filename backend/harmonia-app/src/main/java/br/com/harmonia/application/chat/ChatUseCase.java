package br.com.harmonia.application.chat;

import br.com.harmonia.application.chat.port.ChatMessageRepository;
import br.com.harmonia.application.chat.port.ChatMessageRepository.ConversationSummary;
import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.domain.chat.ChatBodyRule;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.infrastructure.persistence.chat.ChatMessage;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class ChatUseCase {
    private final ChatMessageRepository messages;
    private final CurrentUserService current;
    private final Clock clock;

    public record Conversation(UUID profileId, String profileName, String lastMessage,
                               LocalDateTime lastMessageAt, long unread) {}
    public record Message(UUID id, String body, LocalDateTime sentAt, boolean mine) {}

    public ChatUseCase(ChatMessageRepository messages, CurrentUserService current, Clock clock) {
        this.messages = messages;
        this.current = current;
        this.clock = clock;
    }

    public List<Conversation> teacherChats() {
        return messages.listForTeacher(current.currentTeacher().getId()).stream().map(this::conversation).toList();
    }

    public List<Conversation> studentChats() {
        return messages.listForStudent(current.currentStudent().getId()).stream().map(this::conversation).toList();
    }

    public long teacherUnreadCount() {
        return messages.unreadForTeacher(current.currentTeacher().getId());
    }

    public long studentUnreadCount() {
        return messages.unreadForStudent(current.currentStudent().getId());
    }

    @Transactional
    public List<Message> teacherMessages(UUID studentId) {
        return read(current.currentTeacher().getId(), studentId);
    }

    @Transactional
    public List<Message> studentMessages(UUID teacherId) {
        return read(teacherId, current.currentStudent().getId());
    }

    @Transactional
    public Message sendAsTeacher(UUID studentId, String body) {
        return send(current.currentTeacher().getId(), studentId, body);
    }

    @Transactional
    public Message sendAsStudent(UUID teacherId, String body) {
        return send(teacherId, current.currentStudent().getId(), body);
    }

    private List<Message> read(UUID teacherId, UUID studentId) {
        assertActivePair(teacherId, studentId);
        UUID reader = current.userId();
        messages.markIncomingRead(teacherId, studentId, reader, LocalDateTime.now(clock));
        return messages.latestMessages(teacherId, studentId).reversed().stream()
            .map(message -> message(message, reader)).toList();
    }

    private Message send(UUID teacherId, UUID studentId, String body) {
        assertActivePair(teacherId, studentId);
        var message = new ChatMessage();
        message.setTeacherId(teacherId);
        message.setStudentId(studentId);
        message.setSenderUserId(current.userId());
        message.setBody(ChatBodyRule.normalize(body));
        message.setCreatedAt(LocalDateTime.now(clock));
        return message(messages.save(message), message.getSenderUserId());
    }

    private void assertActivePair(UUID teacherId, UUID studentId) {
        if (!messages.hasActivePair(teacherId, studentId)) throw new ResourceNotFoundException("Conversation");
    }

    private Conversation conversation(ConversationSummary row) {
        return new Conversation(row.getProfileId(), row.getProfileName(), row.getLastMessage(),
            row.getLastMessageAt(), row.getUnread());
    }

    private Message message(ChatMessage message, UUID reader) {
        return new Message(message.getId(), message.getBody(), message.getCreatedAt(),
            message.getSenderUserId().equals(reader));
    }
}
