package br.com.harmonia.infrastructure.email;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class LogEmailSender implements EmailSenderPort {
    private static final Logger log = LoggerFactory.getLogger(LogEmailSender.class);

    @Override
    public void send(String to, String subject, String body) {
        log.info("EMAIL -> {} | {} | {}", to, subject, body);
    }
}
