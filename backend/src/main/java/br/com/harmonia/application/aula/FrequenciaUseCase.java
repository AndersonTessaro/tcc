package br.com.harmonia.application.aula;

import br.com.harmonia.application.aula.port.AulaRepository;
import br.com.harmonia.application.aula.port.FrequenciaRepository;
import br.com.harmonia.application.contexto.CurrentUserService;
import br.com.harmonia.application.gamificacao.port.ProgressoRepository;
import br.com.harmonia.domain.comum.OwnershipException;
import br.com.harmonia.domain.gamificacao.GamificacaoService;
import br.com.harmonia.infrastructure.persistence.aula.Aula;
import br.com.harmonia.infrastructure.persistence.aula.Frequencia;
import br.com.harmonia.infrastructure.persistence.aula.FrequenciaStatus;
import br.com.harmonia.infrastructure.persistence.gamificacao.Progresso;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class FrequenciaUseCase {
    private final FrequenciaRepository frequencias;
    private final AulaRepository aulas;
    private final ProgressoRepository progressos;
    private final CurrentUserService current;
    private final GamificacaoService gami = new GamificacaoService();

    public FrequenciaUseCase(FrequenciaRepository frequencias, AulaRepository aulas,
                             ProgressoRepository progressos, CurrentUserService current) {
        this.frequencias = frequencias;
        this.aulas = aulas;
        this.progressos = progressos;
        this.current = current;
    }

    @Transactional
    public Frequencia registrar(UUID aulaId, FrequenciaStatus status, String justificativa) {
        Aula aula = aulas.findById(aulaId).orElseThrow();
        if (!aula.getMatricula().getProfessor().getId().equals(current.professorAtual().getId()))
            throw new OwnershipException("Aula de outro professor");
        Frequencia f = frequencias.findByAulaId(aulaId).orElseGet(Frequencia::new);
        f.setAula(aula);
        f.setStatus(status);
        f.setJustificativa(justificativa);
        f.setRegistradoEm(LocalDateTime.now());
        Frequencia salva = frequencias.save(f);
        if (status == FrequenciaStatus.PRESENTE) {
            var aluno = aula.getMatricula().getAluno();
            Progresso prog = progressos.findByAlunoId(aluno.getId()).orElseGet(() -> {
                Progresso np = new Progresso();
                np.setAluno(aluno);
                return np;
            });
            prog.setXpTotal(prog.getXpTotal() + gami.xpDePresenca());
            prog.setNivel(gami.nivel(prog.getXpTotal()));
            progressos.save(prog);
        }
        return salva;
    }
}
