package br.com.harmonia.presentation.error;

import br.com.harmonia.application.security.PasswordResetUseCase.InvalidResetTokenException;
import br.com.harmonia.domain.common.OwnershipException;
import br.com.harmonia.infrastructure.security.TokenService.BadRefreshTokenException;
import br.com.harmonia.lessoncore.InvalidMakeupLinkException;
import br.com.harmonia.lessoncore.DomainValidationException;
import br.com.harmonia.lessoncore.ScheduleConflictException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiError> badCredentials(BadCredentialsException e) {
        return build(HttpStatus.UNAUTHORIZED, "BAD_CREDENTIALS", "Invalid login or password", List.of());
    }

    @ExceptionHandler(BadRefreshTokenException.class)
    public ResponseEntity<ApiError> badRefresh(BadRefreshTokenException e) {
        return build(HttpStatus.UNAUTHORIZED, "BAD_REFRESH_TOKEN", e.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidResetTokenException.class)
    public ResponseEntity<ApiError> invalidReset(InvalidResetTokenException e) {
        return build(HttpStatus.BAD_REQUEST, "INVALID_RESET_TOKEN", e.getMessage(), List.of());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> denied(AccessDeniedException e) {
        return build(HttpStatus.FORBIDDEN, "ACCESS_DENIED", "Forbidden", List.of());
    }

    @ExceptionHandler(OwnershipException.class)
    public ResponseEntity<ApiError> ownership(OwnershipException e) {
        return build(HttpStatus.FORBIDDEN, "OWNERSHIP_DENIED", e.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidMakeupLinkException.class)
    public ResponseEntity<ApiError> invalidMakeupLink(InvalidMakeupLinkException e) {
        return build(HttpStatus.CONFLICT, "INVALID_MAKEUP_LINK", e.getMessage(), List.of());
    }

    @ExceptionHandler(ScheduleConflictException.class)
    public ResponseEntity<ApiError> scheduleConflict(ScheduleConflictException e) {
        return build(HttpStatus.CONFLICT, "SCHEDULE_CONFLICT", e.getMessage(), List.of());
    }

    @ExceptionHandler(DomainValidationException.class)
    public ResponseEntity<ApiError> domainValidation(DomainValidationException e) {
        return build(HttpStatus.UNPROCESSABLE_ENTITY, "DOMAIN_VALIDATION", e.getMessage(), List.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> validation(MethodArgumentNotValidException e) {
        var fields = e.getBindingResult().getFieldErrors().stream()
            .map(f -> f.getField() + ": " + f.getDefaultMessage()).toList();
        return build(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION", "Invalid data", fields);
    }

    private ResponseEntity<ApiError> build(HttpStatus st, String code, String msg, List<String> fields) {
        return ResponseEntity.status(st).body(new ApiError(Instant.now(), st.value(), code, msg, fields));
    }
}
