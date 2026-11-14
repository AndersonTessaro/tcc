package br.com.harmonia.presentation.chat;

import br.com.harmonia.application.chat.ChatUseCase;
import br.com.harmonia.application.chat.ChatUseCase.Conversation;
import br.com.harmonia.application.chat.ChatUseCase.Message;
import br.com.harmonia.presentation.error.GlobalExceptionHandler;
import br.com.harmonia.presentation.me.StudentChatController;
import br.com.harmonia.presentation.teacher.TeacherChatController;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ChatControllerTest {
    private final UUID profileId = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private final UUID messageId = UUID.fromString("00000000-0000-0000-0000-000000000002");
    private final LocalDateTime sentAt = LocalDateTime.parse("2026-11-14T10:00:00");
    private ChatUseCase chat;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        chat = mock(ChatUseCase.class);
        mvc = MockMvcBuilders.standaloneSetup(new TeacherChatController(chat), new StudentChatController(chat))
            .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @ParameterizedTest
    @ValueSource(strings = {"/teacher/chats", "/me/chats"})
    void invalidBodiesReturnValidationWithoutInvokingTheUseCase(String path) throws Exception {
        for (String body : List.of("", " \t\r\n ", "\u2003", "a".repeat(2001))) {
            String payload = JsonPath.parse("{}").put("$", "body", body).jsonString();
            mvc.perform(post(path + "/" + profileId + "/messages").contentType("application/json").content(payload))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("VALIDATION"));
        }
        for (String payload : List.of("{}", "{\"body\":null}")) {
            mvc.perform(post(path + "/" + profileId + "/messages").contentType("application/json").content(payload))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("VALIDATION"));
        }
        verifyNoInteractions(chat);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/teacher/chats", "/me/chats"})
    void trimsBeforeValidatingTheMaximumLength(String path) throws Exception {
        String body = "a".repeat(2000);
        var message = new Message(messageId, body, sentAt, true);
        if (path.startsWith("/teacher")) when(chat.sendAsTeacher(profileId, body)).thenReturn(message);
        else when(chat.sendAsStudent(profileId, body)).thenReturn(message);
        String payload = JsonPath.parse("{}").put("$", "body", " \t" + body + " \n").jsonString();
        mvc.perform(post(path + "/" + profileId + "/messages").contentType("application/json").content(payload))
            .andExpect(status().isOk()).andExpect(jsonPath("$.body").value(body))
            .andExpect(jsonPath("$.mine").value(true));
        if (path.startsWith("/teacher")) verify(chat).sendAsTeacher(profileId, body);
        else verify(chat).sendAsStudent(profileId, body);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/teacher/chats", "/me/chats"})
    void serializesTheExactListMessageAndUnreadContracts(String path) throws Exception {
        var conversation = new Conversation(profileId, "Alex", "Hello", sentAt, 1);
        var message = new Message(messageId, "Hello", sentAt, false);
        boolean teacher = path.startsWith("/teacher");
        if (teacher) {
            when(chat.teacherChats()).thenReturn(List.of(conversation));
            when(chat.teacherMessages(profileId)).thenReturn(List.of(message));
            when(chat.teacherUnreadCount()).thenReturn(1L);
        } else {
            when(chat.studentChats()).thenReturn(List.of(conversation));
            when(chat.studentMessages(profileId)).thenReturn(List.of(message));
            when(chat.studentUnreadCount()).thenReturn(1L);
        }
        String profile = teacher ? "student" : "teacher";
        mvc.perform(get(path)).andExpect(status().isOk()).andExpect(content().json("""
            [{"%sId":"%s","%sName":"Alex","lastMessage":"Hello","lastMessageAt":"2026-11-14T10:00:00","unread":1}]
            """.formatted(profile, profileId, profile)));
        mvc.perform(get(path + "/" + profileId + "/messages")).andExpect(status().isOk())
            .andExpect(content().json("""
                [{"id":"00000000-0000-0000-0000-000000000002","body":"Hello","sentAt":"2026-11-14T10:00:00","mine":false}]
                """));
        mvc.perform(get(path + "/unread-count")).andExpect(status().isOk())
            .andExpect(content().json("{\"count\":1}"));
    }
}
