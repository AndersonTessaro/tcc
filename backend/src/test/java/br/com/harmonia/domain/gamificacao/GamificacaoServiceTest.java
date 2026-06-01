package br.com.harmonia.domain.gamificacao;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class GamificacaoServiceTest {
    private final GamificacaoService s = new GamificacaoService();

    @Test void xpPratica_capEm120() {
        assertEquals(60, s.xpDePratica(60));
        assertEquals(120, s.xpDePratica(120));
        assertEquals(120, s.xpDePratica(200));
    }

    @Test void xpPresenca_eh20() {
        assertEquals(20, s.xpDePresenca());
    }

    @Test void nivel_porFaixa() {
        assertEquals(1, s.nivel(0));
        assertEquals(1, s.nivel(99));
        assertEquals(2, s.nivel(100));
        assertEquals(3, s.nivel(400));
        assertEquals(4, s.nivel(900));
    }

    @Test void streak_incrementaQuandoOntem() {
        assertEquals(6, s.novaSequencia(5, LocalDate.of(2026, 5, 30), LocalDate.of(2026, 5, 31)));
    }

    @Test void streak_mantemQuandoMesmoDia() {
        assertEquals(5, s.novaSequencia(5, LocalDate.of(2026, 5, 31), LocalDate.of(2026, 5, 31)));
    }

    @Test void streak_reiniciaQuandoGap() {
        assertEquals(1, s.novaSequencia(5, LocalDate.of(2026, 5, 28), LocalDate.of(2026, 5, 31)));
    }

    @Test void streak_um_quandoPrimeiraPratica() {
        assertEquals(1, s.novaSequencia(0, null, LocalDate.of(2026, 5, 31)));
    }
}
