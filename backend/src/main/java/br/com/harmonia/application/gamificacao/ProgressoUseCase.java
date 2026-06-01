package br.com.harmonia.application.gamificacao;

import br.com.harmonia.application.contexto.CurrentUserService;
import br.com.harmonia.application.gamificacao.port.ProgressoRepository;
import br.com.harmonia.infrastructure.persistence.gamificacao.Progresso;
import org.springframework.stereotype.Service;

@Service
public class ProgressoUseCase {
    private final ProgressoRepository progressos;
    private final CurrentUserService current;

    public ProgressoUseCase(ProgressoRepository progressos, CurrentUserService current) {
        this.progressos = progressos;
        this.current = current;
    }

    public Progresso meuProgresso() {
        var aluno = current.alunoAtual();
        return progressos.findByAlunoId(aluno.getId()).orElseGet(() -> {
            Progresso p = new Progresso();
            p.setAluno(aluno);
            return p;
        });
    }
}
