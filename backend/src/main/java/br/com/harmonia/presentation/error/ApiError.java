package br.com.harmonia.presentation.error;

import java.time.Instant;
import java.util.List;

public record ApiError(Instant timestamp, int status, String code, String message, List<String> fields) {
}
