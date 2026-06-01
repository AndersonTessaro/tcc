package br.com.harmonia.application.gamificacao;

import br.com.harmonia.application.contexto.CurrentUserService;
import br.com.harmonia.application.gamificacao.port.MetaRepository;
import br.com.harmonia.domain.comum.OwnershipException;
import br.com.harmonia.infrastructure.persistence.gamificacao.Meta;
import br.com.harmonia.infrastructure.persistence.gamificacao.MetaStatus;
import br.com.harmonia.infrastructure.persistence.gamificacao.MetaTipo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class MetaUseCase {
    private final MetaRepository metas;
    private final CurrentUserService current;

    public MetaUseCase(MetaRepository metas, CurrentUserService current) {
        this.metas = metas;
        this.current = current;
    }

    public List<Meta> listar(MetaStatus status) {
        var aluno = current.alunoAtual();
        return status == null ? metas.findByAlunoId(aluno.getId())
                              : metas.findByAlunoIdAndStatus(aluno.getId(), status);
    }

    @Transactional
    public Meta criar(String titulo, String descricao, MetaTipo tipo, int alvo) {
        Meta m = new Meta();
        m.setAluno(current.alunoAtual());
        m.setTitulo(titulo);
        m.setDescricao(descricao);
        m.setTipo(tipo);
        m.setAlvo(alvo);
        return metas.save(m);
    }

    @Transactional
    public Meta atualizarProgresso(UUID metaId, int progressoAtual) {
        Meta m = metas.findById(metaId).orElseThrow();
        if (!m.getAluno().getId().equals(current.alunoAtual().getId()))
            throw new OwnershipException("Meta de outro aluno");
        m.setProgressoAtual(progressoAtual);
        if (progressoAtual >= m.getAlvo() && m.getStatus() == MetaStatus.ATIVA) {
            m.setStatus(MetaStatus.CONCLUIDA);
            m.setConcluidaEm(LocalDateTime.now());
        }
        return metas.save(m);
    }
}
