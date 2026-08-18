package br.com.harmonia.infrastructure.email;

public interface EmailSenderPort {
    void send(String to, String subject, String body);
}
