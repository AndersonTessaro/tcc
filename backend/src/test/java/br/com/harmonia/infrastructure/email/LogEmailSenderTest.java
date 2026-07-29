package br.com.harmonia.infrastructure.email;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import static org.assertj.core.api.Assertions.assertThat;

class LogEmailSenderTest {

    private static final String SECRET_TOKEN = "s3cr3t-reset-token-raw-value";

    private ListAppender<ILoggingEvent> appender;
    private Logger logger;

    @BeforeEach
    void setUp() {
        logger = (Logger) LoggerFactory.getLogger(LogEmailSender.class);
        appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void tearDown() {
        logger.detachAppender(appender);
    }

    @Test
    void send_neverLogsTheEmailBody() {
        LogEmailSender sender = new LogEmailSender();

        sender.send("user@example.com", "Recuperação de senha",
            "Use este token para redefinir sua senha: " + SECRET_TOKEN);

        boolean tokenLeaked = appender.list.stream()
            .anyMatch(event -> event.getFormattedMessage().contains(SECRET_TOKEN));
        assertThat(tokenLeaked).isFalse();
    }

    @Test
    void send_masksRecipientAddress() {
        LogEmailSender sender = new LogEmailSender();

        sender.send("maria@example.com", "Recuperação de senha", "corpo qualquer");

        boolean fullAddressLogged = appender.list.stream()
            .anyMatch(event -> event.getFormattedMessage().contains("maria@example.com"));
        assertThat(fullAddressLogged).isFalse();
    }
}
