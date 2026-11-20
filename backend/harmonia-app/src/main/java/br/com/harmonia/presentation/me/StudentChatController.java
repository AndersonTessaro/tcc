package br.com.harmonia.presentation.me;

import br.com.harmonia.application.chat.ChatUseCase;
import br.com.harmonia.presentation.chat.SendChatMessageRequest;
import br.com.harmonia.presentation.response.ChatMessageResponse;
import br.com.harmonia.presentation.response.ChatUnreadCountResponse;
import br.com.harmonia.presentation.response.StudentChatResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/me/chats")
public class StudentChatController {
    private final ChatUseCase chat;

    public StudentChatController(ChatUseCase chat) {
        this.chat = chat;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('chat.read')")
    public List<StudentChatResponse> list() {
        return chat.studentChats().stream().map(StudentChatResponse::from).toList();
    }

    @GetMapping("/unread-count")
    @PreAuthorize("hasAuthority('chat.read')")
    public ChatUnreadCountResponse unreadCount() {
        return new ChatUnreadCountResponse(chat.studentUnreadCount());
    }

    @GetMapping("/{teacherId}/messages")
    @PreAuthorize("hasAuthority('chat.read')")
    public List<ChatMessageResponse> messages(@PathVariable UUID teacherId) {
        return chat.studentMessages(teacherId).stream().map(ChatMessageResponse::from).toList();
    }

    @PostMapping("/{teacherId}/messages")
    @PreAuthorize("hasAuthority('chat.write')")
    public ChatMessageResponse send(@PathVariable UUID teacherId, @Valid @RequestBody SendChatMessageRequest request) {
        return ChatMessageResponse.from(chat.sendAsStudent(teacherId, request.body()));
    }

    @PostMapping(value = "/{teacherId}/messages/audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('chat.write')")
    public ChatMessageResponse sendAudio(@PathVariable UUID teacherId, @RequestParam MultipartFile file) {
        return ChatMessageResponse.from(chat.sendAudioAsStudent(teacherId, file));
    }

    @GetMapping("/{teacherId}/messages/{messageId}/audio")
    @PreAuthorize("hasAuthority('chat.read')")
    public ResponseEntity<byte[]> audio(@PathVariable UUID teacherId, @PathVariable UUID messageId) {
        // Client-declared types are never echoed back: the app reads the type from the message JSON.
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM).body(chat.studentAudio(teacherId, messageId));
    }
}
