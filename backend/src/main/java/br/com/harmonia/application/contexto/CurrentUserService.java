package br.com.harmonia.application.contexto;

import br.com.harmonia.application.perfil.port.AlunoRepository;
import br.com.harmonia.application.perfil.port.ProfessorRepository;
import br.com.harmonia.application.security.port.UsuarioRepository;
import br.com.harmonia.infrastructure.persistence.perfil.Aluno;
import br.com.harmonia.infrastructure.persistence.perfil.Professor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class CurrentUserService {
    private final UsuarioRepository usuarios;
    private final AlunoRepository alunos;
    private final ProfessorRepository professores;

    public CurrentUserService(UsuarioRepository usuarios, AlunoRepository alunos, ProfessorRepository professores) {
        this.usuarios = usuarios;
        this.alunos = alunos;
        this.professores = professores;
    }

    private UUID usuarioId() {
        Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return usuarios.findByUsername(jwt.getSubject()).orElseThrow().getId();
    }

    public Aluno alunoAtual() {
        return alunos.findByUsuarioId(usuarioId())
            .orElseThrow(() -> new IllegalStateException("Usuário não é aluno"));
    }

    public Professor professorAtual() {
        return professores.findByUsuarioId(usuarioId())
            .orElseThrow(() -> new IllegalStateException("Usuário não é professor"));
    }
}
