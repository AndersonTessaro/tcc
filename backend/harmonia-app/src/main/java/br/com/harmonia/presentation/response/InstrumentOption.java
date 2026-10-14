package br.com.harmonia.presentation.response;

import br.com.harmonia.infrastructure.persistence.profile.Instrument;

import java.util.UUID;

public record InstrumentOption(UUID id, String name) {
    public static InstrumentOption of(Instrument instrument) {
        return new InstrumentOption(instrument.getId(), instrument.getName());
    }
}
