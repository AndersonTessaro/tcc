package br.com.harmonia.application.aula;

import br.com.harmonia.application.aula.port.AnexoAulaRepository;
import br.com.harmonia.application.aula.port.AulaRepository;
import br.com.harmonia.application.contexto.CurrentUserService;
import br.com.harmonia.domain.comum.OwnershipException;
import br.com.harmonia.infrastructure.persistence.aula.AnexoAula;
import br.com.harmonia.infrastructure.persistence.aula.Aula;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class AlunoAulaUseCase {
    private final AulaRepository aulas;
    private final AnexoAulaRepository anexos;
    private final CurrentUserService current;

    public AlunoAulaUseCase(AulaRepository aulas, AnexoAulaRepository anexos, CurrentUserService current) {
        this.aulas = aulas;
        this.anexos = anexos;
        this.current = current;
    }

    public List<Aula> minhasAulas(boolean proximas) {
        var alunoId = current.alunoAtual().getId();
        LocalDate hoje = LocalDate.now();
        return aulas.findByMatriculaAlunoIdOrderByDataDesc(alunoId).stream()
            .filter(a -> proximas ? !a.getData().isBefore(hoje) : a.getData().isBefore(hoje))
            .toList();
    }

    public Aula detalhe(UUID aulaId) {
        Aula a = aulas.findById(aulaId).orElseThrow();
        if (!a.getMatricula().getAluno().getId().equals(current.alunoAtual().getId()))
            throw new OwnershipException("Aula de outro aluno");
        return a;
    }

    public List<AnexoAula> anexos(UUID aulaId) {
        detalhe(aulaId);
        return anexos.findByAulaId(aulaId);
    }
}
