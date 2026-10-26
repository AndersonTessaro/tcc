package br.com.harmonia.presentation.account;

import br.com.harmonia.application.account.AvatarUseCase;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class UserAvatarController {
    private final AvatarUseCase avatars;

    public UserAvatarController(AvatarUseCase avatars) {
        this.avatars = avatars;
    }

    @GetMapping("/users/{id}/avatar")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> get(@PathVariable UUID id) {
        var avatar = avatars.forUser(id);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(avatar.contentType())).body(avatar.bytes());
    }
}
