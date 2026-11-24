package br.com.harmonia.domain.chat;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

class ChatBodyRuleTest {
    @Test
    void rejectsNullAndEmptyBody() {
        assertThatIllegalArgumentException().isThrownBy(() -> ChatBodyRule.normalize(null));
        assertThatIllegalArgumentException().isThrownBy(() -> ChatBodyRule.normalize(""));
    }

    @Test
    void rejectsWhitespaceOnlyBody() {
        assertThatIllegalArgumentException().isThrownBy(() -> ChatBodyRule.normalize(" \t\r\n "));
        assertThatIllegalArgumentException().isThrownBy(() -> ChatBodyRule.normalize("\u2003"));
    }

    @Test
    void acceptsTwoThousandCharacters() {
        assertThat(ChatBodyRule.normalize("a".repeat(2000))).hasSize(2000);
    }

    @Test
    void rejectsTwoThousandAndOneCharacters() {
        assertThatIllegalArgumentException().isThrownBy(() -> ChatBodyRule.normalize("a".repeat(2001)));
    }

    @Test
    void trimsEdgesAndPreservesPlainTextInside() {
        assertThat(ChatBodyRule.normalize(" \t <b>Hello</b>\n SELECT * FROM chat_message; \r\n"))
            .isEqualTo("<b>Hello</b>\n SELECT * FROM chat_message;");
        assertThat(ChatBodyRule.normalize(" " + "a".repeat(2000) + " ")).hasSize(2000);
    }
}
