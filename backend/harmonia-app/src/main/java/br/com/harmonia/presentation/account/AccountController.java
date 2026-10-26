package br.com.harmonia.presentation.account;

import br.com.harmonia.application.account.AccountUseCase;
import br.com.harmonia.application.account.AccountUseCase.Account;
import br.com.harmonia.application.account.AvatarUseCase;
import br.com.harmonia.presentation.validation.Passwords;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/account")
@PreAuthorize("isAuthenticated()")
public class AccountController {
    private final AccountUseCase account;
    private final AvatarUseCase avatars;

    public AccountController(AccountUseCase account, AvatarUseCase avatars) {
        this.account = account;
        this.avatars = avatars;
    }

    @PutMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> uploadAvatar(@RequestParam MultipartFile file) {
        avatars.upload(file);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/avatar")
    public ResponseEntity<byte[]> avatar() {
        var avatar = avatars.mine();
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(avatar.contentType())).body(avatar.bytes());
    }

    @DeleteMapping("/avatar")
    public ResponseEntity<Void> deleteAvatar() {
        avatars.delete();
        return ResponseEntity.noContent().build();
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
