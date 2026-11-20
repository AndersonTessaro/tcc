package br.com.harmonia.application.account;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

@Component
public class TermsCatalog {
    // Bump together with the text file; users who accepted an older version are asked again.
    public static final String CURRENT_VERSION = "2026-11-20";

    public record Terms(String version, String text) {}

    private final Terms current;

    public TermsCatalog() {
        try (var in = new ClassPathResource("terms/terms-of-use.md").getInputStream()) {
            current = new Terms(CURRENT_VERSION, new String(in.readAllBytes(), StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public Terms current() {
        return current;
    }

    public boolean isCurrent(String version) {
        return CURRENT_VERSION.equals(version);
    }
}
