package br.com.harmonia.presentation.admin;

import br.com.harmonia.application.admin.AdminCadastroUseCase;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/admin")
public class AdminController {
    private final AdminCadastroUseCase uc;

    public AdminController(AdminCadastroUseCase uc) {
        this.uc = uc;
    }

    public record NovoUsuario(@NotBlank String username, @Email String email,
                              @NotBlank @Size(min = 8) String senha, @NotBlank String nome) {}
    public record NovoInstrumento(@NotBlank String nome) {}
    public record NovaMatricula(@NotNull UUID alunoId, @NotNull UUID professorId, @NotNull UUID instrumentoId) {}

    @PostMapping("/alunos")
    @PreAuthorize("hasAuthority('aluno.manage')")
    public Map<String, UUID> aluno(@Valid @RequestBody NovoUsuario r) {
        return Map.of("id", uc.criarAluno(r.username(), r.email(), r.senha(), r.nome()));
    }

    @PostMapping("/professores")
    @PreAuthorize("hasAuthority('professor.manage')")
    public Map<String, UUID> professor(@Valid @RequestBody NovoUsuario r) {
        return Map.of("id", uc.criarProfessor(r.username(), r.email(), r.senha(), r.nome()));
    }

    @PostMapping("/instrumentos")
    @PreAuthorize("hasAuthority('instrumento.manage')")
    public Map<String, UUID> instrumento(@Valid @RequestBody NovoInstrumento r) {
        return Map.of("id", uc.criarInstrumento(r.nome()));
    }

    @PostMapping("/matriculas")
    @PreAuthorize("hasAuthority('matricula.manage')")
    public Map<String, UUID> matricula(@Valid @RequestBody NovaMatricula r) {
        return Map.of("id", uc.criarMatricula(r.alunoId(), r.professorId(), r.instrumentoId()));
    }
}
