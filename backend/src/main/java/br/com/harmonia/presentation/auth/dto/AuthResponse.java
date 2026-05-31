package br.com.harmonia.presentation.auth.dto;

import java.util.List;

public record AuthResponse(String accessToken, String refreshToken,
                           String username, List<String> authorities) {
}
