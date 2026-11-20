package br.com.harmonia.application.chat;

import br.com.harmonia.application.chat.port.ChatMessageRepository;
import br.com.harmonia.application.chat.port.ChatMessageRepository.ConversationSummary;
import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.storage.StorageTransactions;
import br.com.harmonia.domain.chat.ChatAudioRule;
import br.com.harmonia.domain.chat.ChatBodyRule;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.infrastructure.persistence.chat.ChatMessage;
import org.springframework.stereotype.Service;
import br.com.harmonia.infrastructure.storage.FileStoragePort;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;

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
    private final FileStoragePort storage;

    public record Conversation(UUID profileId, String profileName, String lastMessage,
                               LocalDateTime lastMessageAt, long unread) {}
    public record Audio(String contentType, long sizeBytes) {}
    public record Message(UUID id, String body, LocalDateTime sentAt, boolean mine, Audio audio) {}
    public record AudioContent(String contentType, byte[] bytes) {}

    public ChatUseCase(ChatMessageRepository messages, CurrentUserService current, Clock clock, FileStoragePort storage) {
        this.messages = messages;
        this.current = current;
        this.clock = clock;
        this.storage = storage;
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

    @Transactional
    public Message sendAudioAsTeacher(UUID studentId, MultipartFile file) {
        return sendAudio(current.currentTeacher().getId(), studentId, file);
    }

    @Transactional
    public Message sendAudioAsStudent(UUID teacherId, MultipartFile file) {
        return sendAudio(teacherId, current.currentStudent().getId(), file);
    }

    public AudioContent teacherAudio(UUID studentId, UUID messageId) {
        return audio(current.currentTeacher().getId(), studentId, messageId);
    }

    public AudioContent studentAudio(UUID teacherId, UUID messageId) {
        return audio(teacherId, current.currentStudent().getId(), messageId);
    }

    private Message sendAudio(UUID teacherId, UUID studentId, MultipartFile file) {
        assertActivePair(teacherId, studentId);
        String fileName = file.getOriginalFilename();
        try {
            try (var header = file.getInputStream()) {
                ChatAudioRule.validate(fileName, file.getContentType(), file.getSize(), header.readNBytes(ChatAudioRule.HEAD_BYTES));
            }
            String path;
            try (var content = file.getInputStream()) {
                path = storage.save(fileName, content, file.getSize());
            }
            StorageTransactions.deleteOnRollback(storage, path);
            var message = newMessage(teacherId, studentId, ChatAudioRule.PREVIEW);
            message.setAudioPath(path);
            message.setAudioContentType(file.getContentType());
            message.setAudioSizeBytes(file.getSize());
            return message(messages.save(message), message.getSenderUserId());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private AudioContent audio(UUID teacherId, UUID studentId, UUID messageId) {
        assertActivePair(teacherId, studentId);
        var message = messages.findById(messageId)
            .filter(found -> found.getTeacherId().equals(teacherId) && found.getStudentId().equals(studentId))
            .filter(found -> found.getAudioPath() != null)
            .orElseThrow(() -> new ResourceNotFoundException("Audio"));
        return new AudioContent(message.getAudioContentType(), storage.read(message.getAudioPath()));
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
        var message = newMessage(teacherId, studentId, ChatBodyRule.normalize(body));
        return message(messages.save(message), message.getSenderUserId());
    }

    private ChatMessage newMessage(UUID teacherId, UUID studentId, String body) {
        var message = new ChatMessage();
        message.setTeacherId(teacherId);
        message.setStudentId(studentId);
        message.setSenderUserId(current.userId());
        message.setBody(body);
        message.setCreatedAt(LocalDateTime.now(clock));
        return message;
    }

    private void assertActivePair(UUID teacherId, UUID studentId) {
        if (!messages.hasActivePair(teacherId, studentId)) throw new ResourceNotFoundException("Conversation");
    }

    private Conversation conversation(ConversationSummary row) {
        return new Conversation(row.getProfileId(), row.getProfileName(), row.getLastMessage(),
            row.getLastMessageAt(), row.getUnread());
    }

    private Message message(ChatMessage message, UUID reader) {
        Audio audio = message.getAudioPath() == null ? null
            : new Audio(message.getAudioContentType(), message.getAudioSizeBytes());
        return new Message(message.getId(), message.getBody(), message.getCreatedAt(),
            message.getSenderUserId().equals(reader), audio);
    }
}
