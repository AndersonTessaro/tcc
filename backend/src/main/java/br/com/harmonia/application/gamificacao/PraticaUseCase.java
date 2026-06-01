package br.com.harmonia.application.gamificacao;

import br.com.harmonia.application.contexto.CurrentUserService;
import br.com.harmonia.application.gamificacao.port.PraticaRepository;
import br.com.harmonia.application.gamificacao.port.ProgressoRepository;
import br.com.harmonia.domain.gamificacao.GamificacaoService;
import br.com.harmonia.infrastructure.persistence.gamificacao.Pratica;
import br.com.harmonia.infrastructure.persistence.gamificacao.Progresso;
import br.com.harmonia.infrastructure.persistence.perfil.Aluno;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class PraticaUseCase {
    private final PraticaRepository praticas;
    private final ProgressoRepository progressos;
    private final CurrentUserService current;
    private final GamificacaoService gami = new GamificacaoService();

    public PraticaUseCase(PraticaRepository praticas, ProgressoRepository progressos, CurrentUserService current) {
        this.praticas = praticas;
        this.progressos = progressos;
        this.current = current;
    }

    @Transactional
    public Progresso registrar(int duracaoMin, LocalDate data, String observacao) {
        Aluno aluno = current.alunoAtual();
        int xp = gami.xpDePratica(duracaoMin);

        Pratica pratica = new Pratica();
        pratica.setAluno(aluno);
        pratica.setData(data);
        pratica.setDuracaoMin(duracaoMin);
        pratica.setObservacao(observacao);
        pratica.setXpGanho(xp);
        praticas.save(pratica);

        Progresso prog = progressos.findByAlunoId(aluno.getId()).orElseGet(() -> {
            Progresso np = new Progresso();
            np.setAluno(aluno);
            return np;
        });
        prog.setSequenciaDias(gami.novaSequencia(prog.getSequenciaDias(), prog.getUltimaPratica(), data));
        prog.setXpTotal(prog.getXpTotal() + xp);
        prog.setNivel(gami.nivel(prog.getXpTotal()));
        prog.setTempoPraticaTotalMin(prog.getTempoPraticaTotalMin() + duracaoMin);
        prog.setUltimaPratica(data);
        prog.setAtualizadoEm(LocalDateTime.now());
        return progressos.save(prog);
    }

    public int praticaSemanalMin(UUID alunoId) {
        LocalDate hoje = LocalDate.now();
        LocalDate inicioSemana = hoje.with(DayOfWeek.MONDAY);
        return praticas.findByAlunoIdAndDataBetween(alunoId, inicioSemana, hoje)
            .stream().mapToInt(Pratica::getDuracaoMin).sum();
    }
}
