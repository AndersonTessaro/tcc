package br.com.harmonia.infrastructure.email;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class LogEmailSender implements EmailSenderPort {
    private static final Logger log = LoggerFactory.getLogger(LogEmailSender.class);

    @Override
    public void send(String to, String subject, String body) {
        log.debug("Email queued for {} | subject: {}", mask(to), subject);
    }

    private static String mask(String email) {
        int at = email.indexOf('@');
        if (at <= 1) return "***" + email.substring(Math.max(at, 0));
        return email.charAt(0) + "***" + email.substring(at);
    }
}
