package br.com.harmonia.presentation.professor;

import br.com.harmonia.application.aula.FrequenciaUseCase;
import br.com.harmonia.application.aula.ProfessorAulaUseCase;
import br.com.harmonia.application.material.ProfessorMaterialUseCase;
import br.com.harmonia.application.professor.ProfessorUseCase;
import br.com.harmonia.infrastructure.persistence.aula.Aula;
import br.com.harmonia.infrastructure.persistence.aula.Frequencia;
import br.com.harmonia.infrastructure.persistence.aula.FrequenciaStatus;
import br.com.harmonia.infrastructure.persistence.material.Material;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@RestController
@RequestMapping("/professor")
public class ProfessorController {
    private final ProfessorUseCase prof;
    private final ProfessorAulaUseCase aula;
    private final FrequenciaUseCase freq;
    private final ProfessorMaterialUseCase material;

    public ProfessorController(ProfessorUseCase prof, ProfessorAulaUseCase aula,
                               FrequenciaUseCase freq, ProfessorMaterialUseCase material) {
        this.prof = prof;
        this.aula = aula;
        this.freq = freq;
        this.material = material;
    }

    public record NovaAula(@NotNull UUID matriculaId, @NotNull LocalDate data,
                           @NotNull LocalTime horaInicio, LocalTime horaFim,
                           String conteudo, String tarefaCasa) {}
    public record RegistrarFrequencia(@NotNull FrequenciaStatus status, String justificativa) {}

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('aluno.read')")
    public Object dashboard() {
        return prof.dashboard();
    }

    @GetMapping("/alunos")
    @PreAuthorize("hasAuthority('aluno.read')")
    public Object alunos() {
        return prof.alunosVinculados();
    }

    @GetMapping("/alunos/{id}")
    @PreAuthorize("hasAuthority('aluno.read')")
    public Object alunoDetalhe(@PathVariable UUID id) {
        return prof.detalheAluno(id);
    }

    @PostMapping("/aulas")
    @PreAuthorize("hasAuthority('aula.manage')")
    public Aula novaAula(@Valid @RequestBody NovaAula r) {
        return aula.registrar(r.matriculaId(), r.data(), r.horaInicio(), r.horaFim(), r.conteudo(), r.tarefaCasa());
    }

    @GetMapping("/aulas")
    @PreAuthorize("hasAuthority('aula.read')")
    public Object historico(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
                            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        return aula.historico(inicio, fim);
    }

    @PostMapping("/aulas/{id}/frequencia")
    @PreAuthorize("hasAuthority('frequencia.manage')")
    public Frequencia registrarFrequencia(@PathVariable UUID id, @Valid @RequestBody RegistrarFrequencia r) {
        return freq.registrar(id, r.status(), r.justificativa());
    }

    @PostMapping(value = "/alunos/{id}/materiais", consumes = "multipart/form-data")
    @PreAuthorize("hasAuthority('material.manage')")
    public Material anexarMaterial(@PathVariable UUID id, @RequestParam String titulo,
                                   @RequestParam(required = false) String descricao,
                                   @RequestParam MultipartFile arquivo) {
        return material.anexar(id, titulo, descricao, arquivo);
    }

    @GetMapping("/agenda")
    @PreAuthorize("hasAuthority('aula.read')")
    public Object agenda(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data) {
        return aula.agendaDoDia(data);
    }

    @GetMapping("/relatorios")
    @PreAuthorize("hasAuthority('relatorio.read')")
    public Object relatorios(@RequestParam UUID alunoId) {
        return prof.detalheAluno(alunoId);
    }
}
