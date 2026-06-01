package br.com.harmonia.application.aula;

import br.com.harmonia.application.aula.port.AulaRepository;
import br.com.harmonia.application.contexto.CurrentUserService;
import br.com.harmonia.application.perfil.port.MatriculaRepository;
import br.com.harmonia.domain.comum.OwnershipException;
import br.com.harmonia.infrastructure.persistence.aula.Aula;
import br.com.harmonia.infrastructure.persistence.aula.AulaStatus;
import br.com.harmonia.infrastructure.persistence.perfil.Matricula;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Service
public class ProfessorAulaUseCase {
    private final AulaRepository aulas;
    private final MatriculaRepository matriculas;
    private final CurrentUserService current;

    public ProfessorAulaUseCase(AulaRepository aulas, MatriculaRepository matriculas, CurrentUserService current) {
        this.aulas = aulas;
        this.matriculas = matriculas;
        this.current = current;
    }

    private Matricula matriculaDoProfessor(UUID matriculaId, UUID professorId) {
        Matricula m = matriculas.findById(matriculaId).orElseThrow();
        if (!m.getProfessor().getId().equals(professorId))
            throw new OwnershipException("Matrícula de outro professor");
        return m;
    }

    @Transactional
    public Aula registrar(UUID matriculaId, LocalDate data, LocalTime ini, LocalTime fim,
                          String conteudo, String tarefa) {
        var prof = current.professorAtual();
        Aula a = new Aula();
        a.setMatricula(matriculaDoProfessor(matriculaId, prof.getId()));
        a.setData(data);
        a.setHoraInicio(ini);
        a.setHoraFim(fim);
        a.setConteudo(conteudo);
        a.setTarefaCasa(tarefa);
        a.setStatus(AulaStatus.REALIZADA);
        return aulas.save(a);
    }

    public List<Aula> historico(LocalDate ini, LocalDate fim) {
        return aulas.findByMatriculaProfessorIdAndDataBetween(current.professorAtual().getId(), ini, fim);
    }

    public List<Aula> agendaDoDia(LocalDate data) {
        return aulas.findByMatriculaProfessorIdAndData(current.professorAtual().getId(), data);
    }
}
