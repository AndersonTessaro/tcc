package br.com.harmonia.presentation.aluno;

import br.com.harmonia.application.aula.AlunoAulaUseCase;
import br.com.harmonia.application.gamificacao.MetaUseCase;
import br.com.harmonia.application.gamificacao.PraticaUseCase;
import br.com.harmonia.application.gamificacao.ProgressoUseCase;
import br.com.harmonia.application.material.AlunoMaterialUseCase;
import br.com.harmonia.infrastructure.persistence.gamificacao.Meta;
import br.com.harmonia.infrastructure.persistence.gamificacao.MetaStatus;
import br.com.harmonia.infrastructure.persistence.gamificacao.MetaTipo;
import br.com.harmonia.infrastructure.persistence.gamificacao.Progresso;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/me")
public class AlunoController {
    private final ProgressoUseCase progresso;
    private final PraticaUseCase pratica;
    private final MetaUseCase meta;
    private final AlunoAulaUseCase aula;
    private final AlunoMaterialUseCase material;

    public AlunoController(ProgressoUseCase progresso, PraticaUseCase pratica, MetaUseCase meta,
                          AlunoAulaUseCase aula, AlunoMaterialUseCase material) {
        this.progresso = progresso;
        this.pratica = pratica;
        this.meta = meta;
        this.aula = aula;
        this.material = material;
    }

    public record RegistrarPratica(@Min(1) int duracaoMin, LocalDate data, String observacao) {}
    public record NovaMeta(@NotBlank String titulo, String descricao, @NotNull MetaTipo tipo, @Min(1) int alvo) {}

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('progresso.read')")
    public Map<String, Object> dashboard() {
        Progresso p = progresso.meuProgresso();
        var proximas = aula.minhasAulas(true);
        Map<String, Object> body = new HashMap<>();
        body.put("xp", p.getXpTotal());
        body.put("nivel", p.getNivel());
        body.put("sequenciaDias", p.getSequenciaDias());
        body.put("praticaSemanalMin", pratica.praticaSemanalMin(p.getAluno().getId()));
        body.put("proximaAula", proximas.isEmpty() ? null : proximas.get(proximas.size() - 1));
        return body;
    }

    @GetMapping("/aulas")
    @PreAuthorize("hasAuthority('aula.read')")
    public Object aulas(@RequestParam(defaultValue = "proximas") String status) {
        return aula.minhasAulas("proximas".equals(status));
    }

    @GetMapping("/aulas/{id}")
    @PreAuthorize("hasAuthority('aula.read')")
    public Map<String, Object> aulaDetalhe(@PathVariable UUID id) {
        return Map.of("aula", aula.detalhe(id), "anexos", aula.anexos(id));
    }

    @GetMapping("/materiais")
    @PreAuthorize("hasAuthority('material.read')")
    public Object materiais(@RequestParam(required = false) String busca) {
        return material.listar(busca);
    }

    @GetMapping("/materiais/{id}/download")
    @PreAuthorize("hasAuthority('material.read')")
    public ResponseEntity<byte[]> download(@PathVariable UUID id) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM).body(material.baixar(id));
    }

    @PostMapping("/praticas")
    @PreAuthorize("hasAuthority('pratica.register')")
    public Progresso registrarPratica(@Valid @RequestBody RegistrarPratica r) {
        return pratica.registrar(r.duracaoMin(), r.data() == null ? LocalDate.now() : r.data(), r.observacao());
    }

    @GetMapping("/progresso")
    @PreAuthorize("hasAuthority('progresso.read')")
    public Progresso progresso() {
        return progresso.meuProgresso();
    }

    @GetMapping("/metas")
    @PreAuthorize("hasAuthority('meta.read')")
    public List<Meta> metas(@RequestParam(required = false) MetaStatus status) {
        return meta.listar(status);
    }

    @PostMapping("/metas")
    @PreAuthorize("hasAuthority('meta.manage')")
    public Meta criarMeta(@Valid @RequestBody NovaMeta r) {
        return meta.criar(r.titulo(), r.descricao(), r.tipo(), r.alvo());
    }

    @PutMapping("/metas/{id}")
    @PreAuthorize("hasAuthority('meta.manage')")
    public Meta progressoMeta(@PathVariable UUID id, @RequestParam int progresso) {
        return meta.atualizarProgresso(id, progresso);
    }
}
