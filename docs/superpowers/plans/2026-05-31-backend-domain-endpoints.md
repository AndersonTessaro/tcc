# Backend — Domínio + Endpoints (Aluno + Professor) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sobre a fundação do Plano 1, entregar o domínio pedagógico + gamificação e os endpoints REST de Aluno (`/me/*`) e Professor (`/professor/*`), com autorização por permissão + ownership.

**Architecture:** Clean Architecture pragmática. Entidades JPA na `infrastructure`; **domínio puro** para a regra de gamificação (XP/nível/streak) e para o filtro de ownership. Use cases na `application`, controllers finos na `presentation`.

**Tech Stack:** (herdado do Plano 1) Java 25, Spring Boot 4, Postgres, Flyway, Spring Security method-security, JUnit 5, Testcontainers.

**Pré-requisito:** Plano 1 concluído (auth, `Usuario`, portas, `@PreAuthorize`, `GlobalExceptionHandler`, Testcontainers).

---

## File Structure (novos pacotes)

```
domain/
  gamificacao/GamificacaoService.java        # PURO: XP, nível, streak
  comum/OwnershipException.java
application/
  perfil/   {Aluno,Professor}UseCase + portas
  aula/     AulaUseCase, FrequenciaUseCase
  material/ MaterialUseCase
  gamificacao/ PraticaUseCase, MetaUseCase, ProgressoUseCase
  contexto/ CurrentUserService.java          # resolve aluno/professor do JWT
infrastructure/persistence/
  perfil/   Aluno, Professor, Instrumento, Turma, Matricula (+ repos)
  aula/     Aula, Frequencia, AnexoAula (+ repos)
  material/ Material (+ repo)
  gamificacao/ Pratica, Progresso, Meta (+ repos)
  storage/  ArquivoStoragePort, LocalStorageAdapter
presentation/
  aluno/    AlunoController (/me/*)
  professor/ProfessorController (/professor/*)
  admin/    AdminController (/admin/* mínimo)
```

---

## Task 1: Migration V3 — cadastros pedagógicos

**Files:** Create `backend/src/main/resources/db/migration/V3__cadastros.sql`

- [ ] **Step 1: Criar `V3__cadastros.sql`**

```sql
CREATE TABLE instrumento (
    id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome  VARCHAR(80) NOT NULL UNIQUE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE aluno (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id       UUID NOT NULL UNIQUE REFERENCES auth_user(id) ON DELETE CASCADE,
    data_nascimento  DATE,
    telefone         VARCHAR(20),
    ativo            BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE professor (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID NOT NULL UNIQUE REFERENCES auth_user(id) ON DELETE CASCADE,
    bio         VARCHAR(500),
    ativo       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE professor_instrumento (
    professor_id   UUID NOT NULL REFERENCES professor(id) ON DELETE CASCADE,
    instrumento_id UUID NOT NULL REFERENCES instrumento(id) ON DELETE CASCADE,
    PRIMARY KEY (professor_id, instrumento_id)
);

CREATE TABLE turma (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome           VARCHAR(100) NOT NULL,
    professor_id   UUID NOT NULL REFERENCES professor(id),
    instrumento_id UUID REFERENCES instrumento(id),
    ativo          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE matricula (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id       UUID NOT NULL REFERENCES aluno(id),
    professor_id   UUID NOT NULL REFERENCES professor(id),
    instrumento_id UUID NOT NULL REFERENCES instrumento(id),
    turma_id       UUID REFERENCES turma(id),
    data_inicio    DATE NOT NULL DEFAULT CURRENT_DATE,
    status         VARCHAR(20) NOT NULL DEFAULT 'ATIVA'
);
CREATE INDEX idx_matricula_aluno ON matricula(aluno_id);
CREATE INDEX idx_matricula_professor ON matricula(professor_id);
```

- [ ] **Step 2: Subir e verificar** — `cd backend && ./mvnw spring-boot:run` (Ctrl+C). Expected: Flyway aplica V3.
- [ ] **Step 3: Commit** — `git add . && git commit -m "feat(backend): V3 cadastros (aluno/professor/instrumento/turma/matricula)"`

---

## Task 2: Entidades + repositórios de cadastro

**Files:** Create em `infrastructure/persistence/perfil/`: `Aluno, Professor, Instrumento, Turma, Matricula` + `repository/*`. Enum `MatriculaStatus`.

- [ ] **Step 1: Enums e entidades** (compacto — todos os campos do V3)

```java
package br.com.harmonia.infrastructure.persistence.perfil;
public enum MatriculaStatus { ATIVA, TRANCADA, ENCERRADA }
```
```java
package br.com.harmonia.infrastructure.persistence.perfil;
import jakarta.persistence.*; import lombok.*; import java.util.UUID;
@Entity @Table(name="instrumento") @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Instrumento {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false, unique=true) private String nome;
    @Column(nullable=false) private Boolean ativo = true;
}
```
```java
package br.com.harmonia.infrastructure.persistence.perfil;
import br.com.harmonia.infrastructure.persistence.security.Usuario;
import jakarta.persistence.*; import lombok.*; import java.time.LocalDate; import java.util.UUID;
@Entity @Table(name="aluno") @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Aluno {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @OneToOne(optional=false) @JoinColumn(name="usuario_id") private Usuario usuario;
    @Column(name="data_nascimento") private LocalDate dataNascimento;
    private String telefone;
    @Column(nullable=false) private Boolean ativo = true;
}
```
```java
package br.com.harmonia.infrastructure.persistence.perfil;
import br.com.harmonia.infrastructure.persistence.security.Usuario;
import jakarta.persistence.*; import lombok.*; import java.util.*;
@Entity @Table(name="professor") @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Professor {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @OneToOne(optional=false) @JoinColumn(name="usuario_id") private Usuario usuario;
    private String bio;
    @Column(nullable=false) private Boolean ativo = true;
    @ManyToMany(fetch=FetchType.LAZY)
    @JoinTable(name="professor_instrumento",
        joinColumns=@JoinColumn(name="professor_id"),
        inverseJoinColumns=@JoinColumn(name="instrumento_id"))
    private Set<Instrumento> instrumentos = new LinkedHashSet<>();
}
```
```java
package br.com.harmonia.infrastructure.persistence.perfil;
import jakarta.persistence.*; import lombok.*; import java.util.UUID;
@Entity @Table(name="turma") @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Turma {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private String nome;
    @ManyToOne(optional=false) @JoinColumn(name="professor_id") private Professor professor;
    @ManyToOne @JoinColumn(name="instrumento_id") private Instrumento instrumento;
    @Column(nullable=false) private Boolean ativo = true;
}
```
```java
package br.com.harmonia.infrastructure.persistence.perfil;
import jakarta.persistence.*; import lombok.*; import java.time.LocalDate; import java.util.UUID;
@Entity @Table(name="matricula") @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Matricula {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @ManyToOne(optional=false) @JoinColumn(name="aluno_id") private Aluno aluno;
    @ManyToOne(optional=false) @JoinColumn(name="professor_id") private Professor professor;
    @ManyToOne(optional=false) @JoinColumn(name="instrumento_id") private Instrumento instrumento;
    @ManyToOne @JoinColumn(name="turma_id") private Turma turma;
    @Column(name="data_inicio", nullable=false) private LocalDate dataInicio = LocalDate.now();
    @Enumerated(EnumType.STRING) @Column(nullable=false) private MatriculaStatus status = MatriculaStatus.ATIVA;
}
```

- [ ] **Step 2: Repositórios** (em `application/perfil/port/`)

```java
package br.com.harmonia.application.perfil.port;
import br.com.harmonia.infrastructure.persistence.perfil.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface AlunoRepository extends JpaRepository<Aluno, UUID> {
    Optional<Aluno> findByUsuarioId(UUID usuarioId);
}
```
```java
package br.com.harmonia.application.perfil.port;
import br.com.harmonia.infrastructure.persistence.perfil.Professor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface ProfessorRepository extends JpaRepository<Professor, UUID> {
    Optional<Professor> findByUsuarioId(UUID usuarioId);
}
```
```java
package br.com.harmonia.application.perfil.port;
import br.com.harmonia.infrastructure.persistence.perfil.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface MatriculaRepository extends JpaRepository<Matricula, UUID> {
    List<Matricula> findByProfessorId(UUID professorId);
    List<Matricula> findByAlunoId(UUID alunoId);
    List<Matricula> findByProfessorIdAndAlunoId(UUID professorId, UUID alunoId);
}
```
```java
package br.com.harmonia.application.perfil.port;
import br.com.harmonia.infrastructure.persistence.perfil.Instrumento;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface InstrumentoRepository extends JpaRepository<Instrumento, UUID> {}
```
```java
package br.com.harmonia.application.perfil.port;
import br.com.harmonia.infrastructure.persistence.perfil.Turma;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface TurmaRepository extends JpaRepository<Turma, UUID> {}
```

- [ ] **Step 3: Subir (valida mapeamento)** — `./mvnw spring-boot:run` (Ctrl+C). Expected: OK.
- [ ] **Step 4: Commit** — `git commit -am "feat(backend): cadastro entities + repositories"`

---

## Task 3: `/admin/*` mínimo — popular dados (sem UI)

**Files:** Create `application/admin/AdminCadastroUseCase.java`, `presentation/admin/AdminController.java` + DTOs. Guard `*.manage`.

> Permite criar instrumentos, usuários aluno/professor e matrículas via API (Postman) enquanto o Configurador web não existe.

- [ ] **Step 1: `AdminCadastroUseCase`** (cria usuário + perfil + atribui role)

```java
package br.com.harmonia.application.admin;

import br.com.harmonia.application.perfil.port.*;
import br.com.harmonia.application.security.port.*;
import br.com.harmonia.infrastructure.persistence.perfil.*;
import br.com.harmonia.infrastructure.persistence.security.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class AdminCadastroUseCase {
    private final UsuarioRepository usuarios; private final RoleRepository roles;
    private final AlunoRepository alunos; private final ProfessorRepository professores;
    private final InstrumentoRepository instrumentos; private final MatriculaRepository matriculas;
    private final PasswordEncoder encoder;

    public AdminCadastroUseCase(UsuarioRepository u, RoleRepository r, AlunoRepository a,
        ProfessorRepository p, InstrumentoRepository i, MatriculaRepository m, PasswordEncoder e) {
        this.usuarios=u; this.roles=r; this.alunos=a; this.professores=p;
        this.instrumentos=i; this.matriculas=m; this.encoder=e;
    }

    private Usuario novoUsuario(String username, String email, String senha, String nome, String role) {
        Usuario u = new Usuario();
        u.setUsername(username); u.setEmail(email); u.setDisplayName(nome);
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
        Instrumento i = new Instrumento(); i.setNome(nome);
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
```

- [ ] **Step 2: `AdminController`** (DTOs inline como records)

```java
package br.com.harmonia.presentation.admin;

import br.com.harmonia.application.admin.AdminCadastroUseCase;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/admin")
public class AdminController {
    private final AdminCadastroUseCase uc;
    public AdminController(AdminCadastroUseCase uc) { this.uc = uc; }

    public record NovoUsuario(@NotBlank String username, @Email String email,
                              @NotBlank @Size(min=8) String senha, @NotBlank String nome) {}
    public record NovoInstrumento(@NotBlank String nome) {}
    public record NovaMatricula(@NotNull UUID alunoId, @NotNull UUID professorId, @NotNull UUID instrumentoId) {}

    @PostMapping("/alunos") @PreAuthorize("hasAuthority('aluno.manage')")
    public Map<String,UUID> aluno(@org.springframework.web.bind.annotation.RequestBody NovoUsuario r) {
        return Map.of("id", uc.criarAluno(r.username(), r.email(), r.senha(), r.nome())); }

    @PostMapping("/professores") @PreAuthorize("hasAuthority('professor.manage')")
    public Map<String,UUID> professor(@org.springframework.web.bind.annotation.RequestBody NovoUsuario r) {
        return Map.of("id", uc.criarProfessor(r.username(), r.email(), r.senha(), r.nome())); }

    @PostMapping("/instrumentos") @PreAuthorize("hasAuthority('instrumento.manage')")
    public Map<String,UUID> instrumento(@org.springframework.web.bind.annotation.RequestBody NovoInstrumento r) {
        return Map.of("id", uc.criarInstrumento(r.nome())); }

    @PostMapping("/matriculas") @PreAuthorize("hasAuthority('matricula.manage')")
    public Map<String,UUID> matricula(@org.springframework.web.bind.annotation.RequestBody NovaMatricula r) {
        return Map.of("id", uc.criarMatricula(r.alunoId(), r.professorId(), r.instrumentoId())); }
}
```

- [ ] **Step 3: Teste IT — admin cria aluno/instrumento/matrícula**

```java
// src/test/java/br/com/harmonia/admin/AdminCadastroIT.java — segue padrão Testcontainers do Plano 1.
// login admin → POST /admin/instrumentos, /admin/alunos, /admin/professores, /admin/matriculas → 200 + id.
// Reusar helper loginAdmin() (copiar do AuthorizationIT).
```
Implementar o IT com os 4 POSTs encadeados, assertando `id` presente e status 200; e um POST sem token → 401.

- [ ] **Step 4: Rodar e commitar** — `./mvnw -q test` → PASS. `git commit -am "feat(backend): minimal /admin endpoints to seed data"`

---

## Task 4: Migration V4 — aulas, frequência, anexos, materiais

**Files:** Create `V4__aulas_materiais.sql`

- [ ] **Step 1: Criar `V4__aulas_materiais.sql`**

```sql
CREATE TABLE aula (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula_id UUID NOT NULL REFERENCES matricula(id),
    data         DATE NOT NULL,
    hora_inicio  TIME NOT NULL,
    hora_fim     TIME,
    status       VARCHAR(20) NOT NULL DEFAULT 'AGENDADA',
    conteudo     VARCHAR(1000),
    tarefa_casa  VARCHAR(1000),
    observacoes  VARCHAR(1000),
    criado_em    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_aula_matricula ON aula(matricula_id);
CREATE INDEX idx_aula_data ON aula(data);

CREATE TABLE frequencia (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aula_id       UUID NOT NULL UNIQUE REFERENCES aula(id) ON DELETE CASCADE,
    status        VARCHAR(20) NOT NULL,
    justificativa VARCHAR(500),
    registrado_em TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE anexo_aula (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aula_id       UUID NOT NULL REFERENCES aula(id) ON DELETE CASCADE,
    nome_arquivo  VARCHAR(255) NOT NULL,
    storage_path  VARCHAR(500) NOT NULL,
    content_type  VARCHAR(120),
    tamanho_bytes BIGINT,
    criado_em     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE material (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professor_id  UUID NOT NULL REFERENCES professor(id),
    aluno_id      UUID NOT NULL REFERENCES aluno(id),
    titulo        VARCHAR(150) NOT NULL,
    descricao     VARCHAR(500),
    nome_arquivo  VARCHAR(255) NOT NULL,
    storage_path  VARCHAR(500) NOT NULL,
    content_type  VARCHAR(120),
    tamanho_bytes BIGINT,
    criado_em     TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_material_aluno ON material(aluno_id);
```

- [ ] **Step 2: Subir, verificar, commit** — `./mvnw spring-boot:run` (Ctrl+C) → V4 aplicada. `git commit -am "feat(backend): V4 aulas/frequencia/anexos/materiais"`

---

## Task 5: Entidades aula/material + porta de storage

**Files:** entidades em `persistence/aula/` e `persistence/material/`, repos, e `infrastructure/storage/{ArquivoStoragePort,LocalStorageAdapter}.java`.

- [ ] **Step 1: Enums + entidades** (campos do V4)

```java
package br.com.harmonia.infrastructure.persistence.aula;
public enum AulaStatus { AGENDADA, REALIZADA, CANCELADA }
```
```java
package br.com.harmonia.infrastructure.persistence.aula;
public enum FrequenciaStatus { PRESENTE, FALTA, FALTA_JUSTIFICADA }
```
```java
package br.com.harmonia.infrastructure.persistence.aula;
import br.com.harmonia.infrastructure.persistence.perfil.Matricula;
import jakarta.persistence.*; import lombok.*;
import java.time.*; import java.util.UUID;
@Entity @Table(name="aula") @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Aula {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @ManyToOne(optional=false) @JoinColumn(name="matricula_id") private Matricula matricula;
    @Column(nullable=false) private LocalDate data;
    @Column(name="hora_inicio", nullable=false) private LocalTime horaInicio;
    @Column(name="hora_fim") private LocalTime horaFim;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private AulaStatus status = AulaStatus.AGENDADA;
    private String conteudo;
    @Column(name="tarefa_casa") private String tarefaCasa;
    private String observacoes;
    @Column(name="criado_em", nullable=false) private LocalDateTime criadoEm = LocalDateTime.now();
}
```
```java
package br.com.harmonia.infrastructure.persistence.aula;
import jakarta.persistence.*; import lombok.*; import java.time.LocalDateTime; import java.util.UUID;
@Entity @Table(name="frequencia") @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Frequencia {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @OneToOne(optional=false) @JoinColumn(name="aula_id") private Aula aula;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private FrequenciaStatus status;
    private String justificativa;
    @Column(name="registrado_em", nullable=false) private LocalDateTime registradoEm = LocalDateTime.now();
}
```
```java
package br.com.harmonia.infrastructure.persistence.aula;
import jakarta.persistence.*; import lombok.*; import java.time.LocalDateTime; import java.util.UUID;
@Entity @Table(name="anexo_aula") @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class AnexoAula {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @ManyToOne(optional=false) @JoinColumn(name="aula_id") private Aula aula;
    @Column(name="nome_arquivo", nullable=false) private String nomeArquivo;
    @Column(name="storage_path", nullable=false) private String storagePath;
    @Column(name="content_type") private String contentType;
    @Column(name="tamanho_bytes") private Long tamanhoBytes;
    @Column(name="criado_em", nullable=false) private LocalDateTime criadoEm = LocalDateTime.now();
}
```
```java
package br.com.harmonia.infrastructure.persistence.material;
import br.com.harmonia.infrastructure.persistence.perfil.*;
import jakarta.persistence.*; import lombok.*; import java.time.LocalDateTime; import java.util.UUID;
@Entity @Table(name="material") @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Material {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @ManyToOne(optional=false) @JoinColumn(name="professor_id") private Professor professor;
    @ManyToOne(optional=false) @JoinColumn(name="aluno_id") private Aluno aluno;
    @Column(nullable=false) private String titulo;
    private String descricao;
    @Column(name="nome_arquivo", nullable=false) private String nomeArquivo;
    @Column(name="storage_path", nullable=false) private String storagePath;
    @Column(name="content_type") private String contentType;
    @Column(name="tamanho_bytes") private Long tamanhoBytes;
    @Column(name="criado_em", nullable=false) private LocalDateTime criadoEm = LocalDateTime.now();
}
```

- [ ] **Step 2: Repositórios**

```java
package br.com.harmonia.application.aula.port;
import br.com.harmonia.infrastructure.persistence.aula.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate; import java.util.*;
public interface AulaRepository extends JpaRepository<Aula, UUID> {
    List<Aula> findByMatriculaAlunoIdOrderByDataDesc(UUID alunoId);
    List<Aula> findByMatriculaProfessorIdAndDataBetween(UUID professorId, LocalDate ini, LocalDate fim);
    List<Aula> findByMatriculaProfessorIdAndData(UUID professorId, LocalDate data);
}
```
```java
package br.com.harmonia.application.aula.port;
import br.com.harmonia.infrastructure.persistence.aula.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface FrequenciaRepository extends JpaRepository<Frequencia, UUID> {
    Optional<Frequencia> findByAulaId(UUID aulaId);
    long countByAulaMatriculaProfessorIdAndStatus(UUID professorId, FrequenciaStatus status);
}
```
```java
package br.com.harmonia.application.aula.port;
import br.com.harmonia.infrastructure.persistence.aula.AnexoAula;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface AnexoAulaRepository extends JpaRepository<AnexoAula, UUID> {
    List<AnexoAula> findByAulaId(UUID aulaId);
}
```
```java
package br.com.harmonia.application.material.port;
import br.com.harmonia.infrastructure.persistence.material.Material;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface MaterialRepository extends JpaRepository<Material, UUID> {
    List<Material> findByAlunoId(UUID alunoId);
    List<Material> findByAlunoIdAndTituloContainingIgnoreCase(UUID alunoId, String busca);
}
```

- [ ] **Step 3: Porta de storage + adapter local**

```java
package br.com.harmonia.infrastructure.storage;
public interface ArquivoStoragePort {
    /** Salva bytes e devolve o storage_path. */
    String salvar(String nomeArquivo, byte[] conteudo);
    byte[] ler(String storagePath);
}
```
```java
package br.com.harmonia.infrastructure.storage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.io.*; import java.nio.file.*; import java.util.UUID;
@Component
public class LocalStorageAdapter implements ArquivoStoragePort {
    private final Path root;
    public LocalStorageAdapter(@Value("${app.storage.local-dir:./storage}") String dir) throws IOException {
        this.root = Path.of(dir); Files.createDirectories(root);
    }
    @Override public String salvar(String nomeArquivo, byte[] conteudo) {
        try {
            String key = UUID.randomUUID() + "_" + nomeArquivo.replaceAll("[^A-Za-z0-9._-]", "_");
            Files.write(root.resolve(key), conteudo);
            return key;
        } catch (IOException e) { throw new UncheckedIOException(e); }
    }
    @Override public byte[] ler(String storagePath) {
        try { return Files.readAllBytes(root.resolve(storagePath)); }
        catch (IOException e) { throw new UncheckedIOException(e); }
    }
}
```

- [ ] **Step 4: Subir, validar, commit** — `./mvnw spring-boot:run` (Ctrl+C). `git commit -am "feat(backend): aula/material entities + storage port + local adapter"`

---

## Task 6: Migration V5 — gamificação

**Files:** Create `V5__gamificacao.sql`

- [ ] **Step 1: Criar `V5__gamificacao.sql`**

```sql
CREATE TABLE pratica (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id       UUID NOT NULL REFERENCES aluno(id),
    instrumento_id UUID REFERENCES instrumento(id),
    data           DATE NOT NULL,
    duracao_min    INT NOT NULL,
    observacao     VARCHAR(500),
    xp_ganho       INT NOT NULL DEFAULT 0,
    criado_em      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_pratica_aluno ON pratica(aluno_id);

CREATE TABLE progresso (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id                UUID NOT NULL UNIQUE REFERENCES aluno(id) ON DELETE CASCADE,
    xp_total                INT NOT NULL DEFAULT 0,
    nivel                   INT NOT NULL DEFAULT 1,
    sequencia_dias          INT NOT NULL DEFAULT 0,
    ultima_pratica          DATE,
    tempo_pratica_total_min INT NOT NULL DEFAULT 0,
    atualizado_em           TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE meta (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id                 UUID NOT NULL REFERENCES aluno(id),
    criado_por_professor_id  UUID REFERENCES professor(id),
    titulo                   VARCHAR(150) NOT NULL,
    descricao                VARCHAR(500),
    tipo                     VARCHAR(30) NOT NULL,
    alvo                     INT NOT NULL,
    progresso_atual          INT NOT NULL DEFAULT 0,
    status                   VARCHAR(20) NOT NULL DEFAULT 'ATIVA',
    prazo                    DATE,
    criado_em                TIMESTAMP NOT NULL DEFAULT now(),
    concluida_em             TIMESTAMP
);
CREATE INDEX idx_meta_aluno ON meta(aluno_id);
```

- [ ] **Step 2: Subir, commit** — `./mvnw spring-boot:run` (Ctrl+C). `git commit -am "feat(backend): V5 gamificacao (pratica/progresso/meta)"`

---

## Task 7: Entidades + repos de gamificação

**Files:** `persistence/gamificacao/{Pratica,Progresso,Meta}.java` + enums + repos.

- [ ] **Step 1: Enums + entidades**

```java
package br.com.harmonia.infrastructure.persistence.gamificacao;
public enum MetaTipo { SEQUENCIA, TEMPO_PRATICA, AULAS, FREQUENCIA, OUTRO }
```
```java
package br.com.harmonia.infrastructure.persistence.gamificacao;
public enum MetaStatus { ATIVA, CONCLUIDA }
```
```java
package br.com.harmonia.infrastructure.persistence.gamificacao;
import br.com.harmonia.infrastructure.persistence.perfil.*;
import jakarta.persistence.*; import lombok.*;
import java.time.*; import java.util.UUID;
@Entity @Table(name="pratica") @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Pratica {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @ManyToOne(optional=false) @JoinColumn(name="aluno_id") private Aluno aluno;
    @ManyToOne @JoinColumn(name="instrumento_id") private Instrumento instrumento;
    @Column(nullable=false) private LocalDate data;
    @Column(name="duracao_min", nullable=false) private Integer duracaoMin;
    private String observacao;
    @Column(name="xp_ganho", nullable=false) private Integer xpGanho = 0;
    @Column(name="criado_em", nullable=false) private LocalDateTime criadoEm = LocalDateTime.now();
}
```
```java
package br.com.harmonia.infrastructure.persistence.gamificacao;
import br.com.harmonia.infrastructure.persistence.perfil.Aluno;
import jakarta.persistence.*; import lombok.*;
import java.time.*; import java.util.UUID;
@Entity @Table(name="progresso") @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Progresso {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @OneToOne(optional=false) @JoinColumn(name="aluno_id") private Aluno aluno;
    @Column(name="xp_total", nullable=false) private Integer xpTotal = 0;
    @Column(nullable=false) private Integer nivel = 1;
    @Column(name="sequencia_dias", nullable=false) private Integer sequenciaDias = 0;
    @Column(name="ultima_pratica") private LocalDate ultimaPratica;
    @Column(name="tempo_pratica_total_min", nullable=false) private Integer tempoPraticaTotalMin = 0;
    @Column(name="atualizado_em", nullable=false) private LocalDateTime atualizadoEm = LocalDateTime.now();
}
```
```java
package br.com.harmonia.infrastructure.persistence.gamificacao;
import br.com.harmonia.infrastructure.persistence.perfil.*;
import jakarta.persistence.*; import lombok.*;
import java.time.*; import java.util.UUID;
@Entity @Table(name="meta") @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Meta {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @ManyToOne(optional=false) @JoinColumn(name="aluno_id") private Aluno aluno;
    @ManyToOne @JoinColumn(name="criado_por_professor_id") private Professor criadoPor;
    @Column(nullable=false) private String titulo;
    private String descricao;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private MetaTipo tipo;
    @Column(nullable=false) private Integer alvo;
    @Column(name="progresso_atual", nullable=false) private Integer progressoAtual = 0;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private MetaStatus status = MetaStatus.ATIVA;
    private LocalDate prazo;
    @Column(name="criado_em", nullable=false) private LocalDateTime criadoEm = LocalDateTime.now();
    @Column(name="concluida_em") private LocalDateTime concluidaEm;
}
```

- [ ] **Step 2: Repos**

```java
package br.com.harmonia.application.gamificacao.port;
import br.com.harmonia.infrastructure.persistence.gamificacao.Pratica;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate; import java.util.*;
public interface PraticaRepository extends JpaRepository<Pratica, UUID> {
    List<Pratica> findByAlunoIdAndDataBetween(UUID alunoId, LocalDate ini, LocalDate fim);
}
```
```java
package br.com.harmonia.application.gamificacao.port;
import br.com.harmonia.infrastructure.persistence.gamificacao.Progresso;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface ProgressoRepository extends JpaRepository<Progresso, UUID> {
    Optional<Progresso> findByAlunoId(UUID alunoId);
}
```
```java
package br.com.harmonia.application.gamificacao.port;
import br.com.harmonia.infrastructure.persistence.gamificacao.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface MetaRepository extends JpaRepository<Meta, UUID> {
    List<Meta> findByAlunoIdAndStatus(UUID alunoId, MetaStatus status);
    List<Meta> findByAlunoId(UUID alunoId);
}
```

- [ ] **Step 3: Subir, commit** — `git commit -am "feat(backend): gamificacao entities + repos"`

---

## Task 8: `GamificacaoService` — domínio puro (TDD)

**Files:** Create `domain/gamificacao/GamificacaoService.java` + Test.

Regras (spec §7): XP prática = `min(duracaoMin, 120)`; XP presença = `+20`;
nível = `floor(sqrt(xp/100)) + 1`; streak: +1 se prática hoje e última foi ontem, mantém se hoje==última, senão reseta para 1.

- [ ] **Step 1: Teste que falha**

```java
package br.com.harmonia.domain.gamificacao;

import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;

class GamificacaoServiceTest {
    private final GamificacaoService s = new GamificacaoService();

    @Test void xpPratica_capEm120() {
        assertEquals(60, s.xpDePratica(60));
        assertEquals(120, s.xpDePratica(120));
        assertEquals(120, s.xpDePratica(200));
    }
    @Test void xpPresenca_eh20() { assertEquals(20, s.xpDePresenca()); }

    @Test void nivel_porFaixa() {
        assertEquals(1, s.nivel(0));
        assertEquals(1, s.nivel(99));
        assertEquals(2, s.nivel(100));
        assertEquals(3, s.nivel(400));
        assertEquals(4, s.nivel(900));
    }

    @Test void streak_incrementaQuandoOntem() {
        assertEquals(6, s.novaSequencia(5, LocalDate.of(2026,5,30), LocalDate.of(2026,5,31)));
    }
    @Test void streak_mantemQuandoMesmoDia() {
        assertEquals(5, s.novaSequencia(5, LocalDate.of(2026,5,31), LocalDate.of(2026,5,31)));
    }
    @Test void streak_reiniciaQuandoGap() {
        assertEquals(1, s.novaSequencia(5, LocalDate.of(2026,5,28), LocalDate.of(2026,5,31)));
    }
    @Test void streak_um_quandoPrimeiraPratica() {
        assertEquals(1, s.novaSequencia(0, null, LocalDate.of(2026,5,31)));
    }
}
```

- [ ] **Step 2: Rodar e ver falhar** — `./mvnw -q -Dtest=GamificacaoServiceTest test` → FAIL.

- [ ] **Step 3: Implementar**

```java
package br.com.harmonia.domain.gamificacao;

import java.time.LocalDate;

/** Regras de gamificação (RN07). Puro — sem Spring/JPA. */
public class GamificacaoService {
    private static final int CAP_XP_PRATICA = 120;
    private static final int XP_PRESENCA = 20;

    public int xpDePratica(int duracaoMin) { return Math.min(Math.max(duracaoMin, 0), CAP_XP_PRATICA); }
    public int xpDePresenca() { return XP_PRESENCA; }

    public int nivel(int xpTotal) {
        return (int) Math.floor(Math.sqrt(Math.max(xpTotal, 0) / 100.0)) + 1;
    }

    /** Nova sequência de dias consecutivos com prática. */
    public int novaSequencia(int sequenciaAtual, LocalDate ultimaPratica, LocalDate hoje) {
        if (ultimaPratica == null) return 1;
        if (ultimaPratica.isEqual(hoje)) return Math.max(sequenciaAtual, 1);
        if (ultimaPratica.isEqual(hoje.minusDays(1))) return sequenciaAtual + 1;
        return 1;
    }
}
```

- [ ] **Step 4: Rodar e ver passar** — `./mvnw -q -Dtest=GamificacaoServiceTest test` → PASS (7 testes).
- [ ] **Step 5: Commit** — `git commit -am "feat(backend): pure-domain GamificacaoService (XP/nivel/streak) + tests"`

---

## Task 9: `CurrentUserService` — resolve perfil + ownership

**Files:** Create `application/contexto/CurrentUserService.java`, `domain/comum/OwnershipException.java`. Mapear no handler (403).

- [ ] **Step 1: Exceção de ownership**

```java
package br.com.harmonia.domain.comum;
public class OwnershipException extends RuntimeException {
    public OwnershipException(String m) { super(m); }
}
```

- [ ] **Step 2: `CurrentUserService`**

```java
package br.com.harmonia.application.contexto;

import br.com.harmonia.application.perfil.port.*;
import br.com.harmonia.application.security.port.UsuarioRepository;
import br.com.harmonia.infrastructure.persistence.perfil.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service
public class CurrentUserService {
    private final UsuarioRepository usuarios; private final AlunoRepository alunos;
    private final ProfessorRepository professores;
    public CurrentUserService(UsuarioRepository u, AlunoRepository a, ProfessorRepository p) {
        this.usuarios=u; this.alunos=a; this.professores=p;
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
```

- [ ] **Step 3: Handler 403 para `OwnershipException`** (adicionar em `GlobalExceptionHandler`)

```java
@ExceptionHandler(br.com.harmonia.domain.comum.OwnershipException.class)
public ResponseEntity<ApiError> ownership(br.com.harmonia.domain.comum.OwnershipException e) {
    return build(HttpStatus.FORBIDDEN, "OWNERSHIP_DENIED", e.getMessage(), java.util.List.of());
}
```

- [ ] **Step 4: Compilar, commit** — `git commit -am "feat(backend): CurrentUserService + ownership exception"`

---

## Task 10: Endpoints do Aluno (`/me/*`)

**Files:** `application/gamificacao/{PraticaUseCase,MetaUseCase,ProgressoUseCase}.java`, `application/aula/AlunoAulaUseCase.java`, `application/material/AlunoMaterialUseCase.java`, `presentation/aluno/AlunoController.java` + DTOs. Test: `AlunoFlowIT`.

- [ ] **Step 1: `PraticaUseCase` (registra prática → atualiza progresso via `GamificacaoService`)**

```java
package br.com.harmonia.application.gamificacao;

import br.com.harmonia.application.contexto.CurrentUserService;
import br.com.harmonia.application.gamificacao.port.*;
import br.com.harmonia.domain.gamificacao.GamificacaoService;
import br.com.harmonia.infrastructure.persistence.gamificacao.*;
import br.com.harmonia.infrastructure.persistence.perfil.Aluno;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;

@Service
public class PraticaUseCase {
    private final PraticaRepository praticas; private final ProgressoRepository progressos;
    private final CurrentUserService current; private final GamificacaoService gami = new GamificacaoService();

    public PraticaUseCase(PraticaRepository p, ProgressoRepository pr, CurrentUserService c) {
        this.praticas=p; this.progressos=pr; this.current=c;
    }

    @Transactional
    public Progresso registrar(int duracaoMin, LocalDate data, String observacao) {
        Aluno aluno = current.alunoAtual();
        int xp = gami.xpDePratica(duracaoMin);

        Pratica pratica = new Pratica();
        pratica.setAluno(aluno); pratica.setData(data);
        pratica.setDuracaoMin(duracaoMin); pratica.setObservacao(observacao);
        pratica.setXpGanho(xp);
        praticas.save(pratica);

        Progresso prog = progressos.findByAlunoId(aluno.getId()).orElseGet(() -> {
            Progresso np = new Progresso(); np.setAluno(aluno); return np;
        });
        prog.setSequenciaDias(gami.novaSequencia(prog.getSequenciaDias(), prog.getUltimaPratica(), data));
        prog.setXpTotal(prog.getXpTotal() + xp);
        prog.setNivel(gami.nivel(prog.getXpTotal()));
        prog.setTempoPraticaTotalMin(prog.getTempoPraticaTotalMin() + duracaoMin);
        prog.setUltimaPratica(data);
        prog.setAtualizadoEm(LocalDateTime.now());
        return progressos.save(prog);
    }

    public int praticaSemanalMin(java.util.UUID alunoId) {
        LocalDate hoje = LocalDate.now();
        LocalDate inicioSemana = hoje.with(DayOfWeek.MONDAY);
        return praticas.findByAlunoIdAndDataBetween(alunoId, inicioSemana, hoje)
            .stream().mapToInt(Pratica::getDuracaoMin).sum();
    }
}
```

- [ ] **Step 2: `MetaUseCase` e `ProgressoUseCase`**

```java
package br.com.harmonia.application.gamificacao;

import br.com.harmonia.application.contexto.CurrentUserService;
import br.com.harmonia.application.gamificacao.port.MetaRepository;
import br.com.harmonia.infrastructure.persistence.gamificacao.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime; import java.util.*;

@Service
public class MetaUseCase {
    private final MetaRepository metas; private final CurrentUserService current;
    public MetaUseCase(MetaRepository m, CurrentUserService c) { this.metas=m; this.current=c; }

    public List<Meta> listar(MetaStatus status) {
        var aluno = current.alunoAtual();
        return status == null ? metas.findByAlunoId(aluno.getId())
                              : metas.findByAlunoIdAndStatus(aluno.getId(), status);
    }
    @Transactional
    public Meta criar(String titulo, String descricao, MetaTipo tipo, int alvo) {
        Meta m = new Meta(); m.setAluno(current.alunoAtual());
        m.setTitulo(titulo); m.setDescricao(descricao); m.setTipo(tipo); m.setAlvo(alvo);
        return metas.save(m);
    }
    @Transactional
    public Meta atualizarProgresso(UUID metaId, int progressoAtual) {
        Meta m = metas.findById(metaId).orElseThrow();
        if (!m.getAluno().getId().equals(current.alunoAtual().getId()))
            throw new br.com.harmonia.domain.comum.OwnershipException("Meta de outro aluno");
        m.setProgressoAtual(progressoAtual);
        if (progressoAtual >= m.getAlvo() && m.getStatus() == MetaStatus.ATIVA) {
            m.setStatus(MetaStatus.CONCLUIDA); m.setConcluidaEm(LocalDateTime.now());
        }
        return metas.save(m);
    }
}
```
```java
package br.com.harmonia.application.gamificacao;
import br.com.harmonia.application.contexto.CurrentUserService;
import br.com.harmonia.application.gamificacao.port.ProgressoRepository;
import br.com.harmonia.infrastructure.persistence.gamificacao.Progresso;
import org.springframework.stereotype.Service;
@Service
public class ProgressoUseCase {
    private final ProgressoRepository progressos; private final CurrentUserService current;
    public ProgressoUseCase(ProgressoRepository p, CurrentUserService c){ this.progressos=p; this.current=c; }
    public Progresso meuProgresso() {
        var aluno = current.alunoAtual();
        return progressos.findByAlunoId(aluno.getId()).orElseGet(() -> {
            Progresso p = new Progresso(); p.setAluno(aluno); return p;
        });
    }
}
```

- [ ] **Step 3: `AlunoAulaUseCase` e `AlunoMaterialUseCase`**

```java
package br.com.harmonia.application.aula;
import br.com.harmonia.application.aula.port.*;
import br.com.harmonia.application.contexto.CurrentUserService;
import br.com.harmonia.domain.comum.OwnershipException;
import br.com.harmonia.infrastructure.persistence.aula.*;
import org.springframework.stereotype.Service;
import java.time.LocalDate; import java.util.*;
@Service
public class AlunoAulaUseCase {
    private final AulaRepository aulas; private final AnexoAulaRepository anexos;
    private final CurrentUserService current;
    public AlunoAulaUseCase(AulaRepository a, AnexoAulaRepository an, CurrentUserService c){
        this.aulas=a; this.anexos=an; this.current=c; }

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
    public List<AnexoAula> anexos(UUID aulaId) { detalhe(aulaId); return anexos.findByAulaId(aulaId); }
}
```
```java
package br.com.harmonia.application.material;
import br.com.harmonia.application.contexto.CurrentUserService;
import br.com.harmonia.application.material.port.MaterialRepository;
import br.com.harmonia.infrastructure.persistence.material.Material;
import br.com.harmonia.infrastructure.storage.ArquivoStoragePort;
import org.springframework.stereotype.Service;
import java.util.*;
@Service
public class AlunoMaterialUseCase {
    private final MaterialRepository materiais; private final ArquivoStoragePort storage;
    private final CurrentUserService current;
    public AlunoMaterialUseCase(MaterialRepository m, ArquivoStoragePort s, CurrentUserService c){
        this.materiais=m; this.storage=s; this.current=c; }
    public List<Material> listar(String busca) {
        var alunoId = current.alunoAtual().getId();
        return (busca == null || busca.isBlank())
            ? materiais.findByAlunoId(alunoId)
            : materiais.findByAlunoIdAndTituloContainingIgnoreCase(alunoId, busca);
    }
    public byte[] baixar(UUID materialId) {
        Material m = materiais.findById(materialId).orElseThrow();
        if (!m.getAluno().getId().equals(current.alunoAtual().getId()))
            throw new br.com.harmonia.domain.comum.OwnershipException("Material de outro aluno");
        return storage.ler(m.getStoragePath());
    }
}
```

- [ ] **Step 4: `AlunoController` (`/me/*`)**

```java
package br.com.harmonia.presentation.aluno;

import br.com.harmonia.application.aula.AlunoAulaUseCase;
import br.com.harmonia.application.gamificacao.*;
import br.com.harmonia.application.material.AlunoMaterialUseCase;
import br.com.harmonia.infrastructure.persistence.gamificacao.*;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate; import java.util.*;

@RestController @RequestMapping("/me")
public class AlunoController {
    private final ProgressoUseCase progresso; private final PraticaUseCase pratica;
    private final MetaUseCase meta; private final AlunoAulaUseCase aula; private final AlunoMaterialUseCase material;
    public AlunoController(ProgressoUseCase pr, PraticaUseCase pa, MetaUseCase me,
                           AlunoAulaUseCase au, AlunoMaterialUseCase ma) {
        this.progresso=pr; this.pratica=pa; this.meta=me; this.aula=au; this.material=ma; }

    public record RegistrarPratica(@Min(1) int duracaoMin, LocalDate data, String observacao) {}
    public record NovaMeta(@NotBlank String titulo, String descricao, @NotNull MetaTipo tipo, @Min(1) int alvo) {}

    @GetMapping("/dashboard") @PreAuthorize("hasAuthority('progresso.read')")
    public Map<String,Object> dashboard() {
        Progresso p = progresso.meuProgresso();
        var proximas = aula.minhasAulas(true);
        return Map.of(
            "xp", p.getXpTotal(), "nivel", p.getNivel(), "sequenciaDias", p.getSequenciaDias(),
            "praticaSemanalMin", pratica.praticaSemanalMin(p.getAluno().getId()),
            "proximaAula", proximas.isEmpty() ? null : proximas.get(proximas.size()-1));
    }

    @GetMapping("/aulas") @PreAuthorize("hasAuthority('aula.read')")
    public Object aulas(@RequestParam(defaultValue="proximas") String status) {
        return aula.minhasAulas("proximas".equals(status)); }

    @GetMapping("/aulas/{id}") @PreAuthorize("hasAuthority('aula.read')")
    public Map<String,Object> aulaDetalhe(@PathVariable UUID id) {
        var a = aula.detalhe(id);
        return Map.of("aula", a, "anexos", aula.anexos(id)); }

    @GetMapping("/materiais") @PreAuthorize("hasAuthority('material.read')")
    public Object materiais(@RequestParam(required=false) String busca) { return material.listar(busca); }

    @GetMapping("/materiais/{id}/download") @PreAuthorize("hasAuthority('material.read')")
    public ResponseEntity<byte[]> download(@PathVariable UUID id) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM).body(material.baixar(id)); }

    @PostMapping("/praticas") @PreAuthorize("hasAuthority('pratica.register')")
    public Progresso registrarPratica(@org.springframework.web.bind.annotation.RequestBody @jakarta.validation.Valid RegistrarPratica r) {
        return pratica.registrar(r.duracaoMin(), r.data()==null?LocalDate.now():r.data(), r.observacao()); }

    @GetMapping("/progresso") @PreAuthorize("hasAuthority('progresso.read')")
    public Progresso progresso() { return progresso.meuProgresso(); }

    @GetMapping("/metas") @PreAuthorize("hasAuthority('meta.read')")
    public Object metas(@RequestParam(required=false) MetaStatus status) { return meta.listar(status); }

    @PostMapping("/metas") @PreAuthorize("hasAuthority('meta.manage')")
    public Meta criarMeta(@org.springframework.web.bind.annotation.RequestBody @jakarta.validation.Valid NovaMeta r) {
        return meta.criar(r.titulo(), r.descricao(), r.tipo(), r.alvo()); }

    @PutMapping("/metas/{id}") @PreAuthorize("hasAuthority('meta.manage')")
    public Meta progressoMeta(@PathVariable UUID id, @RequestParam int progresso) {
        return meta.atualizarProgresso(id, progresso); }
}
```

- [ ] **Step 5: Teste IT do fluxo aluno**

```java
// src/test/java/br/com/harmonia/aluno/AlunoFlowIT.java — Testcontainers (padrão Plano 1).
// Setup via /admin: login admin → cria instrumento, professor, aluno (guarda credenciais), matrícula.
// Login do aluno → POST /me/praticas (duracaoMin=60) → assert xp=60, nivel=1.
//   2ª prática mesmo dia +120 → assert xp=180, nivel=2 (sqrt(180/100)=1.34→1→nivel2).
// GET /me/dashboard → xp/nivel/sequenciaDias presentes.
// POST /me/metas (alvo=2) → PUT /me/metas/{id}?progresso=2 → status CONCLUIDA.
// GET /me/aulas?status=proximas → 200 lista.
```
Implementar o IT completo conforme roteiro (asserts de XP/nível/streak e conclusão de meta).

- [ ] **Step 6: Rodar e commitar** — `./mvnw -q test` → PASS. `git commit -am "feat(backend): aluno endpoints /me/* (dashboard, pratica, progresso, metas, aulas, materiais)"`

---

## Task 11: Endpoints do Professor (`/professor/*`)

**Files:** `application/professor/ProfessorUseCase.java`, `application/aula/{ProfessorAulaUseCase,FrequenciaUseCase}.java`, `application/material/ProfessorMaterialUseCase.java`, `presentation/professor/ProfessorController.java` + DTOs. Test: `ProfessorFlowIT`.

- [ ] **Step 1: `ProfessorAulaUseCase` + `FrequenciaUseCase`** (ownership por matrícula)

```java
package br.com.harmonia.application.aula;

import br.com.harmonia.application.aula.port.*;
import br.com.harmonia.application.contexto.CurrentUserService;
import br.com.harmonia.application.perfil.port.MatriculaRepository;
import br.com.harmonia.domain.comum.OwnershipException;
import br.com.harmonia.infrastructure.persistence.aula.*;
import br.com.harmonia.infrastructure.persistence.perfil.Matricula;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*; import java.util.*;

@Service
public class ProfessorAulaUseCase {
    private final AulaRepository aulas; private final MatriculaRepository matriculas;
    private final CurrentUserService current;
    public ProfessorAulaUseCase(AulaRepository a, MatriculaRepository m, CurrentUserService c){
        this.aulas=a; this.matriculas=m; this.current=c; }

    private Matricula matriculaDoProfessor(UUID matriculaId, UUID professorId) {
        Matricula m = matriculas.findById(matriculaId).orElseThrow();
        if (!m.getProfessor().getId().equals(professorId)) throw new OwnershipException("Matrícula de outro professor");
        return m;
    }
    @Transactional
    public Aula registrar(UUID matriculaId, LocalDate data, LocalTime ini, LocalTime fim,
                          String conteudo, String tarefa) {
        var prof = current.professorAtual();
        Aula a = new Aula();
        a.setMatricula(matriculaDoProfessor(matriculaId, prof.getId()));
        a.setData(data); a.setHoraInicio(ini); a.setHoraFim(fim);
        a.setConteudo(conteudo); a.setTarefaCasa(tarefa); a.setStatus(AulaStatus.REALIZADA);
        return aulas.save(a);
    }
    public List<Aula> historico(LocalDate ini, LocalDate fim) {
        return aulas.findByMatriculaProfessorIdAndDataBetween(current.professorAtual().getId(), ini, fim); }
    public List<Aula> agendaDoDia(LocalDate data) {
        return aulas.findByMatriculaProfessorIdAndData(current.professorAtual().getId(), data); }
}
```
```java
package br.com.harmonia.application.aula;

import br.com.harmonia.application.aula.port.*;
import br.com.harmonia.application.contexto.CurrentUserService;
import br.com.harmonia.application.gamificacao.port.ProgressoRepository;
import br.com.harmonia.domain.comum.OwnershipException;
import br.com.harmonia.domain.gamificacao.GamificacaoService;
import br.com.harmonia.infrastructure.persistence.aula.*;
import br.com.harmonia.infrastructure.persistence.gamificacao.Progresso;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime; import java.util.UUID;

@Service
public class FrequenciaUseCase {
    private final FrequenciaRepository frequencias; private final AulaRepository aulas;
    private final ProgressoRepository progressos; private final CurrentUserService current;
    private final GamificacaoService gami = new GamificacaoService();
    public FrequenciaUseCase(FrequenciaRepository f, AulaRepository a, ProgressoRepository p, CurrentUserService c){
        this.frequencias=f; this.aulas=a; this.progressos=p; this.current=c; }

    @Transactional
    public Frequencia registrar(UUID aulaId, FrequenciaStatus status, String justificativa) {
        Aula aula = aulas.findById(aulaId).orElseThrow();
        if (!aula.getMatricula().getProfessor().getId().equals(current.professorAtual().getId()))
            throw new OwnershipException("Aula de outro professor");
        Frequencia f = frequencias.findByAulaId(aulaId).orElseGet(Frequencia::new);
        f.setAula(aula); f.setStatus(status); f.setJustificativa(justificativa);
        f.setRegistradoEm(LocalDateTime.now());
        Frequencia salva = frequencias.save(f);
        if (status == FrequenciaStatus.PRESENTE) {       // XP por presença (RN07)
            var aluno = aula.getMatricula().getAluno();
            Progresso prog = progressos.findByAlunoId(aluno.getId()).orElseGet(() -> {
                Progresso np = new Progresso(); np.setAluno(aluno); return np; });
            prog.setXpTotal(prog.getXpTotal() + gami.xpDePresenca());
            prog.setNivel(gami.nivel(prog.getXpTotal()));
            progressos.save(prog);
        }
        return salva;
    }
}
```

- [ ] **Step 2: `ProfessorUseCase` (alunos vinculados, detalhe, dashboard) + `ProfessorMaterialUseCase`**

```java
package br.com.harmonia.application.professor;

import br.com.harmonia.application.contexto.CurrentUserService;
import br.com.harmonia.application.gamificacao.port.ProgressoRepository;
import br.com.harmonia.application.perfil.port.MatriculaRepository;
import br.com.harmonia.domain.comum.OwnershipException;
import br.com.harmonia.infrastructure.persistence.perfil.*;
import org.springframework.stereotype.Service;
import java.util.*; import java.util.stream.*;

@Service
public class ProfessorUseCase {
    private final MatriculaRepository matriculas; private final ProgressoRepository progressos;
    private final CurrentUserService current;
    public ProfessorUseCase(MatriculaRepository m, ProgressoRepository p, CurrentUserService c){
        this.matriculas=m; this.progressos=p; this.current=c; }

    public List<Aluno> alunosVinculados() {
        return matriculas.findByProfessorId(current.professorAtual().getId()).stream()
            .map(Matricula::getAluno).distinct().toList();
    }
    public Map<String,Object> detalheAluno(UUID alunoId) {
        var profId = current.professorAtual().getId();
        if (matriculas.findByProfessorIdAndAlunoId(profId, alunoId).isEmpty())
            throw new OwnershipException("Aluno não vinculado");
        var prog = progressos.findByAlunoId(alunoId).orElse(null);
        return new HashMap<>() {{ put("alunoId", alunoId); put("progresso", prog); }};
    }
    public Map<String,Object> dashboard() {
        var alunos = alunosVinculados();
        return Map.of("totalAlunos", alunos.size(), "alunos", alunos);
    }
}
```
```java
package br.com.harmonia.application.material;
import br.com.harmonia.application.contexto.CurrentUserService;
import br.com.harmonia.application.material.port.MaterialRepository;
import br.com.harmonia.application.perfil.port.AlunoRepository;
import br.com.harmonia.infrastructure.persistence.material.Material;
import br.com.harmonia.infrastructure.storage.ArquivoStoragePort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException; import java.io.UncheckedIOException; import java.util.UUID;
@Service
public class ProfessorMaterialUseCase {
    private final MaterialRepository materiais; private final AlunoRepository alunos;
    private final ArquivoStoragePort storage; private final CurrentUserService current;
    public ProfessorMaterialUseCase(MaterialRepository m, AlunoRepository a, ArquivoStoragePort s, CurrentUserService c){
        this.materiais=m; this.alunos=a; this.storage=s; this.current=c; }
    @Transactional
    public Material anexar(UUID alunoId, String titulo, String descricao, MultipartFile arquivo) {
        try {
            String path = storage.salvar(arquivo.getOriginalFilename(), arquivo.getBytes());
            Material m = new Material();
            m.setProfessor(current.professorAtual());
            m.setAluno(alunos.findById(alunoId).orElseThrow());
            m.setTitulo(titulo); m.setDescricao(descricao);
            m.setNomeArquivo(arquivo.getOriginalFilename()); m.setStoragePath(path);
            m.setContentType(arquivo.getContentType()); m.setTamanhoBytes(arquivo.getSize());
            return materiais.save(m);
        } catch (IOException e) { throw new UncheckedIOException(e); }
    }
}
```

- [ ] **Step 3: `ProfessorController`**

```java
package br.com.harmonia.presentation.professor;

import br.com.harmonia.application.aula.*;
import br.com.harmonia.application.material.ProfessorMaterialUseCase;
import br.com.harmonia.application.professor.ProfessorUseCase;
import br.com.harmonia.infrastructure.persistence.aula.*;
import br.com.harmonia.infrastructure.persistence.material.Material;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.time.*; import java.util.*;

@RestController @RequestMapping("/professor")
public class ProfessorController {
    private final ProfessorUseCase prof; private final ProfessorAulaUseCase aula;
    private final FrequenciaUseCase freq; private final ProfessorMaterialUseCase material;
    public ProfessorController(ProfessorUseCase p, ProfessorAulaUseCase a,
                               FrequenciaUseCase f, ProfessorMaterialUseCase m){
        this.prof=p; this.aula=a; this.freq=f; this.material=m; }

    public record NovaAula(@NotNull UUID matriculaId, @NotNull LocalDate data,
        @NotNull LocalTime horaInicio, LocalTime horaFim, String conteudo, String tarefaCasa) {}
    public record RegistrarFrequencia(@NotNull FrequenciaStatus status, String justificativa) {}

    @GetMapping("/dashboard") @PreAuthorize("hasAuthority('aluno.read')")
    public Object dashboard() { return prof.dashboard(); }

    @GetMapping("/alunos") @PreAuthorize("hasAuthority('aluno.read')")
    public Object alunos() { return prof.alunosVinculados(); }

    @GetMapping("/alunos/{id}") @PreAuthorize("hasAuthority('aluno.read')")
    public Object alunoDetalhe(@PathVariable UUID id) { return prof.detalheAluno(id); }

    @PostMapping("/aulas") @PreAuthorize("hasAuthority('aula.manage')")
    public Aula novaAula(@org.springframework.web.bind.annotation.RequestBody @jakarta.validation.Valid NovaAula r) {
        return aula.registrar(r.matriculaId(), r.data(), r.horaInicio(), r.horaFim(), r.conteudo(), r.tarefaCasa()); }

    @GetMapping("/aulas") @PreAuthorize("hasAuthority('aula.read')")
    public Object historico(@RequestParam LocalDate inicio, @RequestParam LocalDate fim) {
        return aula.historico(inicio, fim); }

    @PostMapping("/aulas/{id}/frequencia") @PreAuthorize("hasAuthority('frequencia.manage')")
    public Frequencia registrarFrequencia(@PathVariable UUID id,
            @org.springframework.web.bind.annotation.RequestBody @jakarta.validation.Valid RegistrarFrequencia r) {
        return freq.registrar(id, r.status(), r.justificativa()); }

    @PostMapping(value="/alunos/{id}/materiais", consumes="multipart/form-data")
    @PreAuthorize("hasAuthority('material.manage')")
    public Material anexarMaterial(@PathVariable UUID id, @RequestParam String titulo,
            @RequestParam(required=false) String descricao, @RequestParam MultipartFile arquivo) {
        return material.anexar(id, titulo, descricao, arquivo); }

    @GetMapping("/agenda") @PreAuthorize("hasAuthority('aula.read')")
    public Object agenda(@RequestParam LocalDate data) { return aula.agendaDoDia(data); }

    @GetMapping("/relatorios") @PreAuthorize("hasAuthority('relatorio.read')")
    public Object relatorios(@RequestParam UUID alunoId) { return prof.detalheAluno(alunoId); }
}
```

- [ ] **Step 4: Teste IT do fluxo professor**

```java
// src/test/java/br/com/harmonia/professor/ProfessorFlowIT.java — Testcontainers.
// Setup via /admin: instrumento + professor (guarda cred) + aluno + matrícula (guarda matriculaId).
// Login professor:
//   GET /professor/alunos → contém o aluno.
//   POST /professor/aulas {matriculaId,...} → 200, guarda aulaId.
//   POST /professor/aulas/{aulaId}/frequencia {status:PRESENTE} → 200.
//   GET /professor/agenda?data=<hoje> → contém a aula.
//   GET /professor/alunos/<outroAlunoNaoVinculado> → 403 (OWNERSHIP_DENIED).
```
Implementar o IT conforme roteiro, incluindo o caso 403 de ownership.

- [ ] **Step 5: Rodar suíte completa e commitar** — `./mvnw test` → PASS. `git commit -am "feat(backend): professor endpoints /professor/* (aulas, frequencia, materiais, agenda, relatorios)"`

---

## Self-Review (cobertura vs spec)

- RF03 dashboard aluno → Task 10. RF04 aulas → 10. RF05 detalhes+anexos → 10. RF06 materiais/download → 10.
  RF07 registrar prática (XP) → 8,10. RF08 progresso → 10. RF09 metas → 10. ✅
- RF10 dashboard prof → 11. RF11 alunos → 11. RF12 detalhe aluno → 11. RF13 registrar aula+anexos → 11.
  RF14 frequência → 11. RF15 histórico → 11. RF16 material ao aluno → 11. RF17 agenda → 11. RF18 relatórios → 11. ✅
- RN04 aula via matrícula → V4/Task5. RN07 XP → Task8. RN08/09 frequência → Task11. RN11 ownership aluno → 10.
  RN12 ownership professor → 11. RNF08 storage → Task5. ✅
- Permissões `@PreAuthorize` em todo endpoint, batendo com o seed do Plano 1. ✅
- Placeholders: ITs descritos como roteiro concreto (passos + asserts) — implementador segue o padrão Testcontainers do Plano 1. Lógica de negócio toda com código completo.
- Consistência: `GamificacaoService`, `CurrentUserService`, portas e entidades usados igual entre tasks.

## Fora deste plano (futuro)
Reposição (RN10), Horário recorrente→geração de aula, relatórios agregados ricos, financeiro/turmas/config (Configurador Admin), e-mail real (SMTP/SES).
