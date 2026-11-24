package br.com.harmonia.presentation.teacher;

import br.com.harmonia.application.chat.ChatUseCase;
import br.com.harmonia.presentation.chat.SendChatMessageRequest;
import br.com.harmonia.presentation.response.ChatMessageResponse;
import br.com.harmonia.presentation.response.ChatUnreadCountResponse;
import br.com.harmonia.presentation.response.TeacherChatResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/teacher/chats")
public class TeacherChatController {
    private final ChatUseCase chat;

    public TeacherChatController(ChatUseCase chat) {
        this.chat = chat;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('chat.read')")
    public List<TeacherChatResponse> list() {
        return chat.teacherChats().stream().map(TeacherChatResponse::from).toList();
    }

    @GetMapping("/unread-count")
    @PreAuthorize("hasAuthority('chat.read')")
    public ChatUnreadCountResponse unreadCount() {
        return new ChatUnreadCountResponse(chat.teacherUnreadCount());
    }

    @GetMapping("/{studentId}/messages")
    @PreAuthorize("hasAuthority('chat.read')")
    public List<ChatMessageResponse> messages(@PathVariable UUID studentId) {
        return chat.teacherMessages(studentId).stream().map(ChatMessageResponse::from).toList();
    }

    @PostMapping("/{studentId}/messages")
    @PreAuthorize("hasAuthority('chat.write')")
    public ChatMessageResponse send(@PathVariable UUID studentId, @Valid @RequestBody SendChatMessageRequest request) {
        return ChatMessageResponse.from(chat.sendAsTeacher(studentId, request.body()));
    }

    @PostMapping(value = "/{studentId}/messages/audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('chat.write')")
    public ChatMessageResponse sendAudio(@PathVariable UUID studentId, @RequestParam MultipartFile file) {
        return ChatMessageResponse.from(chat.sendAudioAsTeacher(studentId, file));
    }

    @GetMapping("/{studentId}/messages/{messageId}/audio")
    @PreAuthorize("hasAuthority('chat.read')")
    public ResponseEntity<byte[]> audio(@PathVariable UUID studentId, @PathVariable UUID messageId) {
        // Client-declared types are never echoed back: the app reads the type from the message JSON.
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM).body(chat.teacherAudio(studentId, messageId));
    }
}
