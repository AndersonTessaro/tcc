package br.com.harmonia.presentation.auth.dto;

import java.util.List;

public record AuthBody(String accessToken, String username, List<String> authorities) {
    public static AuthBody from(AuthResponse r) {
        return new AuthBody(r.accessToken(), r.username(), r.authorities());
    }
}
