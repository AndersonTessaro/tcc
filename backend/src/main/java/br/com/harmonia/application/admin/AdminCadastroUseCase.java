package br.com.harmonia.application.admin;

import br.com.harmonia.application.perfil.port.*;
import br.com.harmonia.application.security.port.RoleRepository;
import br.com.harmonia.application.security.port.UsuarioRepository;
import br.com.harmonia.infrastructure.persistence.perfil.*;
import br.com.harmonia.infrastructure.persistence.security.Usuario;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Service
public class AdminCadastroUseCase {
    private final UsuarioRepository usuarios;
    private final RoleRepository roles;
    private final AlunoRepository alunos;
    private final ProfessorRepository professores;
    private final InstrumentoRepository instrumentos;
    private final MatriculaRepository matriculas;
    private final PasswordEncoder encoder;

    public AdminCadastroUseCase(UsuarioRepository usuarios, RoleRepository roles, AlunoRepository alunos,
                                ProfessorRepository professores, InstrumentoRepository instrumentos,
                                MatriculaRepository matriculas, PasswordEncoder encoder) {
        this.usuarios = usuarios;
        this.roles = roles;
        this.alunos = alunos;
        this.professores = professores;
        this.instrumentos = instrumentos;
        this.matriculas = matriculas;
        this.encoder = encoder;
    }

    private Usuario novoUsuario(String username, String email, String senha, String nome, String role) {
        Usuario u = new Usuario();
        u.setUsername(username);
        u.setEmail(email);
        u.setDisplayName(nome);
        u.setPassword(encoder.encode(senha));
        u.setRoles(new LinkedHashSet<>(Set.of(roles.findByName(role).orElseThrow())));
        return usuarios.save(u);
    }

    @Transactional
    public UUID criarAluno(String username, String email, String senha, String nome) {
        Aluno a = new Aluno();
        a.setUsuario(novoUsuario(username, email, senha, nome, "ALUNO"));
        return alunos.save(a).getId();
    }

    @Transactional
    public UUID criarProfessor(String username, String email, String senha, String nome) {
        Professor p = new Professor();
        p.setUsuario(novoUsuario(username, email, senha, nome, "PROFESSOR"));
        return professores.save(p).getId();
    }

    @Transactional
    public UUID criarInstrumento(String nome) {
        Instrumento i = new Instrumento();
        i.setNome(nome);
        return instrumentos.save(i).getId();
    }

    @Transactional
    public UUID criarMatricula(UUID alunoId, UUID professorId, UUID instrumentoId) {
        Matricula m = new Matricula();
        m.setAluno(alunos.findById(alunoId).orElseThrow());
        m.setProfessor(professores.findById(professorId).orElseThrow());
        m.setInstrumento(instrumentos.findById(instrumentoId).orElseThrow());
        return matriculas.save(m).getId();
    }
}
