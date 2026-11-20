package br.com.harmonia.chat;

import br.com.harmonia.teacher.MoreMenuITSupport;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ChatAudioIT extends MoreMenuITSupport {
    // Smallest bytes the media check accepts as audio: an Ogg page header.
    private static final byte[] OGG = "OggS\0\2\0\0\0\0\0\0\0\0voice".getBytes(StandardCharsets.ISO_8859_1);

    private String teacherId, studentId, teacherToken, studentToken, outsiderToken;

    @BeforeEach
    void setUp() throws Exception {
        String instrumentId = instrument();
        teacherId = teacher("AudioTeacher", instrumentId);
        studentId = student("AudioStudent");
        student("AudioOutsider");
        enroll(studentId, teacherId, instrumentId, "null");
        teacherToken = login("AudioTeacher" + suffix, "Teach@1234");
        studentToken = login("AudioStudent" + suffix, "Student@123");
        outsiderToken = login("AudioOutsider" + suffix, "Student@123");
    }

    private MockMultipartFile audio(String name, String type, byte[] bytes) {
        return new MockMultipartFile("file", name, type, bytes);
    }

    @Test
    void teacherSendsAVoiceMessageAndTheStudentPlaysIt() throws Exception {
        String body = mvc.perform(multipart("/teacher/chats/" + studentId + "/messages/audio")
                .file(audio("voz.ogg", "audio/ogg", OGG)).header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.mine").value(true))
            .andExpect(jsonPath("$.audio.contentType").value("audio/ogg"))
            .andReturn().getResponse().getContentAsString();
        String messageId = JsonPath.read(body, "$.id");

        mvc.perform(get("/me/chats/" + teacherId + "/messages").header("Authorization", "Bearer " + studentToken))
            .andExpect(jsonPath("$[0].id").value(messageId))
            .andExpect(jsonPath("$[0].audio.sizeBytes").value(OGG.length));
        mvc.perform(get("/me/chats").header("Authorization", "Bearer " + studentToken))
            .andExpect(jsonPath("$[0].lastMessage").value("Mensagem de voz"));
        mvc.perform(get("/me/chats/" + teacherId + "/messages/" + messageId + "/audio").header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk()).andExpect(content().bytes(OGG));
        mvc.perform(get("/teacher/chats/" + studentId + "/messages/" + messageId + "/audio").header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isOk());
    }

    @Test
    void studentSendsAVoiceMessage() throws Exception {
        mvc.perform(multipart("/me/chats/" + teacherId + "/messages/audio")
                .file(audio("voz.webm", "audio/webm", new byte[] {0x1A, 0x45, (byte) 0xDF, (byte) 0xA3, 1, 2, 3}))
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.audio.contentType").value("audio/webm"));
    }

    @Test
    void rejectsFilesThatAreNotAudio() throws Exception {
        mvc.perform(multipart("/teacher/chats/" + studentId + "/messages/audio")
                .file(audio("voz.ogg", "audio/ogg", "%PDF-1.4 fake".getBytes(StandardCharsets.US_ASCII)))
                .header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("DOMAIN_VALIDATION"));
        mvc.perform(multipart("/teacher/chats/" + studentId + "/messages/audio")
                .file(audio("video.mp4", "video/mp4", OGG)).header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void outsidersCannotReadTheAudio() throws Exception {
        String body = mvc.perform(multipart("/teacher/chats/" + studentId + "/messages/audio")
                .file(audio("voz.ogg", "audio/ogg", OGG)).header("Authorization", "Bearer " + teacherToken))
            .andReturn().getResponse().getContentAsString();
        String messageId = JsonPath.read(body, "$.id");
        mvc.perform(get("/me/chats/" + teacherId + "/messages/" + messageId + "/audio").header("Authorization", "Bearer " + outsiderToken))
            .andExpect(status().isNotFound());
        mvc.perform(multipart("/me/chats/" + teacherId + "/messages/audio")
                .file(audio("voz.ogg", "audio/ogg", OGG)).header("Authorization", "Bearer " + outsiderToken))
            .andExpect(status().isNotFound());
    }
}
