package br.com.harmonia.application.professor;

import br.com.harmonia.application.contexto.CurrentUserService;
import br.com.harmonia.application.gamificacao.port.ProgressoRepository;
import br.com.harmonia.application.perfil.port.MatriculaRepository;
import br.com.harmonia.domain.comum.OwnershipException;
import br.com.harmonia.infrastructure.persistence.perfil.Aluno;
import br.com.harmonia.infrastructure.persistence.perfil.Matricula;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ProfessorUseCase {
    private final MatriculaRepository matriculas;
    private final ProgressoRepository progressos;
    private final CurrentUserService current;

    public ProfessorUseCase(MatriculaRepository matriculas, ProgressoRepository progressos, CurrentUserService current) {
        this.matriculas = matriculas;
        this.progressos = progressos;
        this.current = current;
    }

    public List<Aluno> alunosVinculados() {
        return matriculas.findByProfessorId(current.professorAtual().getId()).stream()
            .map(Matricula::getAluno).distinct().toList();
    }

    public Map<String, Object> detalheAluno(UUID alunoId) {
        var profId = current.professorAtual().getId();
        if (matriculas.findByProfessorIdAndAlunoId(profId, alunoId).isEmpty())
            throw new OwnershipException("Aluno não vinculado");
        var prog = progressos.findByAlunoId(alunoId).orElse(null);
        Map<String, Object> body = new HashMap<>();
        body.put("alunoId", alunoId);
        body.put("progresso", prog);
        return body;
    }

    public Map<String, Object> dashboard() {
        var alunos = alunosVinculados();
        return Map.of("totalAlunos", alunos.size(), "alunos", alunos);
    }
}
