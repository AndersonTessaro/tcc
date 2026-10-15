package br.com.harmonia.presentation.account;

import br.com.harmonia.application.account.AccountUseCase;
import br.com.harmonia.application.account.AccountUseCase.Account;
import br.com.harmonia.presentation.validation.Passwords;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/account")
@PreAuthorize("isAuthenticated()")
public class AccountController {
    private final AccountUseCase account;

    public AccountController(AccountUseCase account) {
        this.account = account;
    }

    public record UpdateAccount(@NotBlank @Size(max = 120) String displayName, @Size(max = 500) String bio) {}
    public record ChangePassword(@NotBlank String currentPassword, @NotBlank @Size(min = 8) String newPassword) {
        @AssertTrue(message = "password must contain at most 72 UTF-8 bytes")
        public boolean isPasswordWithinByteLimit() {
            return Passwords.fitsBcrypt(newPassword);
        }
    }

    @GetMapping
    public Account get() {
        return account.get();
    }

    @PutMapping
    public Account update(@Valid @RequestBody UpdateAccount request) {
        return account.update(request.displayName(), request.bio());
    }

    @PutMapping("/password")
    public ResponseEntity<Void> password(@Valid @RequestBody ChangePassword request) {
        account.changePassword(request.currentPassword(), request.newPassword());
        return ResponseEntity.noContent().build();
    }
}
