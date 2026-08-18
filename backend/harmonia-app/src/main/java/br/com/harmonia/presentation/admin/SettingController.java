package br.com.harmonia.presentation.admin;

import br.com.harmonia.application.setting.SettingUseCase;
import br.com.harmonia.infrastructure.persistence.setting.Setting;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/settings")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('config.manage')")
public class SettingController {
    private final SettingUseCase uc;

    public SettingController(SettingUseCase uc) {
        this.uc = uc;
    }

    public record UpsertSetting(@NotBlank String value, String description) {}

    @GetMapping
    public List<Setting> list() {
        return uc.list();
    }

    @PutMapping("/{key}")
    public Setting upsert(@PathVariable String key, @Valid @RequestBody UpsertSetting r) {
        return uc.upsert(key, r.value(), r.description());
    }
}
