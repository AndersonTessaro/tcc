package br.com.harmonia.application.setting;

import br.com.harmonia.application.setting.port.SettingRepository;
import br.com.harmonia.infrastructure.persistence.setting.Setting;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class SettingUseCase {
    private final SettingRepository settings;

    public SettingUseCase(SettingRepository settings) {
        this.settings = settings;
    }

    public List<Setting> list() {
        return settings.findAll();
    }

    @Transactional
    public Setting upsert(String key, String value, String description) {
        Setting s = settings.findByKey(key).orElseGet(Setting::new);
        s.setKey(key);
        s.setValue(value);
        if (description != null) s.setDescription(description);
        s.setUpdatedAt(LocalDateTime.now());
        return settings.save(s);
    }
}
