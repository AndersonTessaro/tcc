package br.com.harmonia.domain.gamificacao;

import java.time.LocalDate;

/** Regras de gamificação (RN07). Puro — sem Spring/JPA. */
public class GamificacaoService {
    private static final int CAP_XP_PRATICA = 120;
    private static final int XP_PRESENCA = 20;

    public int xpDePratica(int duracaoMin) {
        return Math.min(Math.max(duracaoMin, 0), CAP_XP_PRATICA);
    }

    public int xpDePresenca() {
        return XP_PRESENCA;
    }

    public int nivel(int xpTotal) {
        return (int) Math.floor(Math.sqrt(Math.max(xpTotal, 0) / 100.0)) + 1;
    }

    /** Nova sequência de dias consecutivos com prática. */
    public int novaSequencia(int sequenciaAtual, LocalDate ultimaPratica, LocalDate hoje) {
        if (ultimaPratica == null) return 1;
        if (ultimaPratica.isEqual(hoje)) return Math.max(sequenciaAtual, 1);
        if (ultimaPratica.isEqual(hoje.minusDays(1))) return sequenciaAtual + 1;
        return 1;
    }
}
