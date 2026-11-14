package br.com.harmonia.presentation.teacher;

import br.com.harmonia.application.chat.ChatUseCase;
import br.com.harmonia.presentation.chat.SendChatMessageRequest;
import br.com.harmonia.presentation.response.ChatMessageResponse;
import br.com.harmonia.presentation.response.ChatUnreadCountResponse;
import br.com.harmonia.presentation.response.TeacherChatResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
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
}
