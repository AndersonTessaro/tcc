package br.com.harmonia.domain.chat;

public final class ChatBodyRule {
    private ChatBodyRule() {}

    public static String normalize(String body) {
        if (body == null) throw new IllegalArgumentException("Message body is required");
        String trimmed = body.strip();
        if (trimmed.isBlank() || trimmed.length() > 2000)
            throw new IllegalArgumentException("Message body must contain 1 to 2000 characters");
        return trimmed;
    }
}
