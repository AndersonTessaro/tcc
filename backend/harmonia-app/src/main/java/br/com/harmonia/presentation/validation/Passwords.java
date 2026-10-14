package br.com.harmonia.presentation.validation;

import java.nio.charset.StandardCharsets;

public final class Passwords {
    private Passwords() {}

    // BCrypt silently truncates passwords past 72 bytes.
    public static boolean fitsBcrypt(String password) {
        return password == null || password.getBytes(StandardCharsets.UTF_8).length <= 72;
    }
}
