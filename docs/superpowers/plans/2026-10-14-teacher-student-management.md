# Plano: professor cadastra/edita aluno + observações; dificuldade e avaliação da prática como campos próprios

> Planejado pelo agente architect em 2026-10-14. Adição 1 (cadastro/edição de aluno pelo professor + observações) e
> Adição 5 (dificuldade/avaliação da prática). Migrations V13–V15 (V12 é a última).

## Achados que o plano assume

- `POST /admin/students` (`AdminController`, `student.manage`) cria User+Student **sem matrícula**; `AdminRegistrationUseCase.createEnrollment` já valida aluno/professor/instrumento ativos, regra `teacher_instrument` (422 "Teacher does not teach this instrument") e matrícula ativa duplicada (409). **Reusar, não duplicar.**
- **Não há pré-checagem de username/e-mail duplicado**: depende do `DataIntegrityViolationException` (23505) → 409 no flush/commit, sem teste e sem dizer qual campo colidiu.
- `TeacherUseCase.assertLinked` é `private` e aceita matrícula **inativa**. `linkedStudents()` também não filtra status.
- `LogEmailSender` só registra o e-mail mascarado (não entrega nem loga o token) → **convite por e-mail é inviável** hoje.
- JWT carrega `authorities` (`TokenService`) → permissão nova só vale após refresh/novo login. V2 deu "todas" ao ADMIN **uma vez** → permissão nova precisa ser concedida ao ADMIN explicitamente.
- `ddl-auto: validate` → tipo da coluna precisa casar com o campo Java (motivo de `rating INT`, não `SMALLINT`).
- `RegisterPractice.notes` não tem `@Size`; >500 chars → `22001` não tratado → 500.
- Mobile: `buildNotes` (`app/(student)/practice/register.tsx:51`) concatena `"atividade; Dificuldade: X; Avaliação: N/5"` (limite 255 no total); `practiceNotes.ts` (professor) e `practiceRating` (`practiceMood.ts`, usado em `practice/history.tsx`) fazem o parse inverso.
- `TeacherStudentDetail.loadStudent` chama `/teacher/students` **só para achar o nome**. Rodapé do Resumo mostra "Nova aula", mas o Figma 23 mostra **"Editar aluno"**.
- Fora de escopo (registrado): `studentDetail` devolve a entidade `Progress` no `Map` (vazamento pré-existente).

## 1. Decisões

| # | Decisão | Motivo | Rejeitado |
|---|---|---|---|
| D1 | **Professor pode cadastrar aluno**, sempre já matriculado com **ele mesmo** e um instrumento que ele ensina, numa única transação. | Botão "+" do Figma 22; RN12 preservada (o aluno nasce vinculado só a quem cadastrou); regra `teacher_instrument` reaproveitada. Revogável tirando a permissão da role TEACHER no Configurador. | Professor criar aluno solto (ficaria invisível para ele mesmo); professor vincular aluno existente (exigiria buscar alunos de outros professores, o que fere RN12; isso continua com o admin). |
| D2 | **Senha inicial definida pelo professor** (mesmas regras do admin: ≥8, ≤72 bytes UTF-8). Login por usuário **ou** e-mail, como hoje. | Único fluxo que funciona sem SMTP real; o admin já pode redefinir senha (`PUT /admin/security/users/{id}/password`). | Convite/token por e-mail (o sender não entrega); senha gerada pelo servidor e exibida (vaza em print/log). |
| D3 | **Professor edita: nome, telefone e observações.** Só o admin edita: e-mail, usuário, senha, ativo, roles. | Trocar e-mail permitiria tomar a conta via "esqueci a senha"; usuário é `updatable=false`. | Professor editar e-mail. |
| D4 | **Dois campos por par professor↔aluno** (tabela `teacher_student_note`): `private_notes` (anotações só do professor) e `shared_notes` (observação para o aluno — o professor escreve, os dois veem). Outro professor do mesmo aluno não vê nenhuma das duas. Admin sem perfil de professor recebe as duas como `null`. **Decisão do dono (2026-10-14).** | RN01/RN12: um aluno pode ter vários professores; a nota de trabalho fica privada e o recado ao aluno tem lugar próprio. | Coluna em `student` (vaza entre professores); coluna em `enrollment` (duplicaria por instrumento e some com matrícula inativa); aluno também escrever na compartilhada (vira chat, fora do escopo). |
| D5 | **Duas permissões novas:** `student.register` (cadastrar aluno vinculado a si) e `student.update` (editar perfil + observações do aluno vinculado). Concedidas a TEACHER e ADMIN. | Criar conta de login é mais sensível que editar nome; dá para revogar uma sem a outra. | Dar `student.manage` ao TEACHER, o que abriria `GET /admin/students` (lista todos os alunos, fere RN12). |
| D6 | **Escrita exige vínculo ATIVO**; leitura mantém o `assertLinked` atual (qualquer matrícula). Extrair `StudentLinkGuard` (`application/teacher`) com `assertLinked` e `assertActivelyLinked`; `TeacherUseCase` passa a usá-lo. | Ex-professor não edita; tira a duplicação. | Deixar `assertLinked` privado e copiar. |
| D7 | Rotas de escrita em `/teacher/students/**` **exigem perfil de professor** (`currentTeacher()` → 403 `PROFILE_REQUIRED` para admin puro). | Nota é por professor; o admin edita pelo web (pós-MVP). | Bypass do admin escrevendo nota "de ninguém". |
| D8 | **Pré-checagem de duplicidade** em `AdminRegistrationUseCase.newUser`: `findByUsername`/`findByEmail` → `DuplicateResourceException("Username already in use" / "Email already in use")`. O 23505 continua como rede para corrida. | 409 com campo identificável (o mobile foca o campo certo); vale também para o admin. | Depender só do 23505. |
| D9 | **Prática: colunas `difficulty VARCHAR(255)` e `rating INT CHECK 1..5`**, ambos opcionais. `notes` passa a significar só "o que praticou". | Fim do parse frágil; `INT` evita `@JdbcTypeCode` com `ddl-auto: validate`. | `SMALLINT` (exige mapeamento extra); nome `mood` (o código e a a11y já usam "Avaliação"/`practiceRating`). |
| D10 | **API compatível:** `POST /me/practices` aceita `difficulty` e `rating` opcionais; cliente antigo que manda só `notes` continua funcionando (salvo como veio). Servidor **não** faz parse de `notes`. | Sem quebra; uma fonte de verdade. | Parse no servidor ao gravar. |
| D11 | **Backfill em migration separada (V15), idempotente**, só para registros na convenção; o resto fica como está. | Pode ser re-executado no IT sobre linhas legadas. | Backfill na mesma migration do `ALTER` (não testável). |
| D12 | **Remover `practiceNotes.ts` e `practiceRating()`** (sem fallback). | O backfill cobre a convenção, e o único produtor era este app. Registro fora da convenção aparece cru em "O que praticou" (nada se perde). Manter o parser deixaria duas fontes de verdade. | Manter como fallback. |
| D13 | **XP inalterado:** `xpFromPractice(durationMin)` continua sendo a única entrada. | Pedido explícito; teste garante. | — |

## 2. Modelo de dados

`V13__teacher_student_management.sql`
```sql
INSERT INTO auth_permission(name, description) VALUES
  ('student.register', 'Register a student linked to the current teacher'),
  ('student.update',   'Update linked student profile and notes'),
  ('note.read',        'Read notes shared by the student''s teachers');

INSERT INTO auth_role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM auth_role r, auth_permission p
WHERE (r.name IN ('ADMIN', 'TEACHER') AND p.name IN ('student.register', 'student.update'))
   OR (r.name IN ('ADMIN', 'STUDENT') AND p.name = 'note.read');

CREATE TABLE teacher_student_note (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id    UUID NOT NULL REFERENCES teacher(id) ON DELETE CASCADE,
    student_id    UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    private_notes VARCHAR(1000),
    shared_notes  VARCHAR(1000),
    updated_at    TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_teacher_student_note UNIQUE (teacher_id, student_id),
    CONSTRAINT ck_teacher_student_note_not_empty CHECK (private_notes IS NOT NULL OR shared_notes IS NOT NULL)
);
```
Campo em branco vira `null`; com os dois `null` a linha é apagada. PK `UUID` + `UNIQUE` segue o padrão do repo (evita `@IdClass`).

`V14__practice_difficulty_rating.sql`
```sql
ALTER TABLE practice
    ADD COLUMN difficulty VARCHAR(255),
    ADD COLUMN rating     INT CONSTRAINT ck_practice_rating CHECK (rating BETWEEN 1 AND 5);
```

`V15__practice_notes_backfill.sql` (instrução única, idempotente; arquivo em UTF-8 por causa de "Avaliação")
```sql
UPDATE practice p
SET notes = s.activity, difficulty = s.difficulty, rating = s.rating
FROM (
    SELECT id, rating,
           nullif(btrim((regexp_match(rest, '(^|;[[:space:]]*)Dificuldade:[[:space:]]*(.*)$'))[2]), '') AS difficulty,
           nullif(btrim(regexp_replace(rest, '(^|;[[:space:]]*)Dificuldade:.*$', '')), '')            AS activity
    FROM (
        SELECT id,
               (regexp_match(notes, '(^|;[[:space:]]*)Avaliação: ([1-5])/5$'))[2]::int AS rating,
               regexp_replace(notes, '(^|;[[:space:]]*)Avaliação: [1-5]/5$', '')      AS rest
        FROM practice
        WHERE difficulty IS NULL AND rating IS NULL
          AND notes ~ '(^|;[[:space:]]*)(Avaliação: [1-5]/5$|Dificuldade:)'
    ) legacy
) s
WHERE p.id = s.id
  AND coalesce(length(s.difficulty), 0) <= 255;
```
Por que funciona: no Postgres o `.` casa quebra de linha por padrão (o "o que praticou" multilinha é preservado), e o casamento mais à esquerda pega o **primeiro** `Dificuldade:`, como o `split` de `practiceNotes.ts` (`"troca; ritmo"` continua inteiro). A avaliação só é extraída quando está no fim, que é onde `buildNotes` sempre a coloca. Dificuldade com mais de 255 caracteres não é migrada. Na segunda execução nada muda: linhas migradas não têm mais marcador ou já têm `difficulty`/`rating`.

Entidades:
- Novo `infrastructure/persistence/profile/TeacherStudentNote.java` (`@ManyToOne teacher`, `@ManyToOne student`, `notes`, `updatedAt`).
- Nova porta `application/profile/port/TeacherStudentNoteRepository` com `Optional<TeacherStudentNote> findByTeacherIdAndStudentId(UUID, UUID)`.
- `Practice.java` ganha `private String difficulty; private Integer rating;`.

## 3. API

| Método + rota | Authority | Ownership | Request | Response |
|---|---|---|---|---|
| `GET /teacher/instruments` | `student.register` | instrumentos **ativos** do professor atual (`teachers.findWithInstrumentsById`) | – | `List<InstrumentOption>` |
| `POST /teacher/students` | `student.register` | aluno nasce matriculado com `currentTeacher()`; ADMIN puro → 403 `PROFILE_REQUIRED` | `NewStudent` | `StudentProfileResponse` |
| `GET /teacher/students/{id}/profile` | `student.read` | `StudentLinkGuard.assertLinked` (ADMIN faz bypass, notas `null`) | – | `StudentProfileResponse` |
| `PUT /teacher/students/{id}/profile` | `student.update` | `assertActivelyLinked` + perfil de professor | `UpdateStudent` | `StudentProfileResponse` |
| `GET /me/teacher-notes` | `note.read` | aluno atual; só `shared_notes` não nulas, nunca `private_notes` | – | `List<SharedNoteResponse>` |
| `POST /me/practices` (existente) | `practice.register` | aluno atual | `+ difficulty?, rating?` | igual (`ProgressResponse` com `practiceId`) |
| `GET /me/practices`, `GET /teacher/students/{id}/practices` (existentes) | iguais | iguais | – | `PracticeResponse` `+ difficulty, rating` |

DTOs (`presentation`):
```java
public record NewStudent(@NotBlank @Size(max = 100) String username, @NotBlank @Email @Size(max = 255) String email,
                         @NotBlank @Size(min = 8) String password, @NotBlank @Size(max = 150) String name,
                         @Size(max = 20) @Pattern(regexp = "^[0-9()+\\- ]{8,20}$") String phone,
                         @NotNull UUID instrumentId, @Size(max = 1000) String privateNotes,
                         @Size(max = 1000) String sharedNotes) { /* @AssertTrue fitsBcrypt */ }
public record UpdateStudent(@NotBlank @Size(max = 150) String name,
                            @Size(max = 20) @Pattern(regexp = "^[0-9()+\\- ]{8,20}$") String phone,
                            @Size(max = 1000) String privateNotes, @Size(max = 1000) String sharedNotes) {}
public record StudentProfileResponse(UUID id, String name, String username, String email, String phone,
                                     String privateNotes, String sharedNotes) {}
public record SharedNoteResponse(String teacherName, String notes, Instant updatedAt) {}
// StudentController.RegisterPractice:
public record RegisterPractice(@Min(1) int durationMin, LocalDate date, @Size(max = 500) String notes,
                               @Size(max = 255) String difficulty, @Min(1) @Max(5) Integer rating) {}
// PracticeResponse: (id, date, durationMin, notes, difficulty, rating, recording)
```
- `PUT` substitui os campos: `phone` null limpa; nota em branco vira `null`; as duas `null` apagam a linha. Strings passam por trim, e em branco vira `null`.
- `fitsBcrypt` sai de `AdminController` para `presentation/validation/Passwords.java`. `InstrumentOption` sai de `AdminController` para `presentation/response/InstrumentOption.java`. Os dois controllers passam a usá-los.
- Senha nunca volta na resposta. A role é fixa `STUDENT` no servidor (nunca vem do cliente).

| Caso | Status / código |
|---|---|
| Usuário ou e-mail já existe | 409 `DUPLICATE_RESOURCE`, "Username already in use" / "Email already in use" |
| Instrumento que o professor não ensina / inativo | 422 `DOMAIN_VALIDATION` (mensagens existentes) |
| Instrumento inexistente | 404 `NOT_FOUND` |
| Bean validation (e-mail, senha, telefone, `rating` 0/6, tamanhos) | 422 `VALIDATION` |
| Aluno não vinculado / vínculo inativo na escrita | 403 `OWNERSHIP_DENIED` (não revela se o aluno existe) |
| Sem authority | 403 `ACCESS_DENIED` |
| ADMIN sem perfil de professor em `POST`/`PUT` | 403 `PROFILE_REQUIRED` |

## 4. Aplicação

- **`AdminRegistrationUseCase`**: pré-checagem de duplicidade em `newUser` (D8); `createStudent(username, email, password, name, phone)` (o admin passa `null`).
- **Novo `application/teacher/StudentLinkGuard`** (`@Component`; `EnrollmentRepository`, `CurrentUserService`): `assertLinked(UUID)` (código atual) e `assertActivelyLinked(UUID)` (exige `EnrollmentStatus.ACTIVE`, sem bypass). `TeacherUseCase` passa a delegar para ele.
- **Novo `application/teacher/TeacherStudentUseCase`** (`AdminRegistrationUseCase`, `StudentRepository`, `TeacherRepository`, `TeacherStudentNoteRepository`, `CurrentUserService`, `StudentLinkGuard`):
  - `List<Instrument> myInstruments()`
  - `@Transactional UUID register(NewStudentCommand c)`: `teacher = currentTeacher()` → `createStudent(...)` → `createEnrollment(id, teacher.getId(), c.instrumentId())` → grava a linha de notas se alguma não estiver em branco. Os métodos internos são `@Transactional` REQUIRED, então qualquer falha desfaz usuário, aluno e matrícula juntos.
  - `@Transactional(readOnly = true) StudentProfile profile(UUID)`: `assertLinked`; notas = `isAdmin() ? null :` notas do par.
  - `@Transactional StudentProfile update(UUID, name, phone, notes)`: `currentTeacher()` → `assertActivelyLinked` → `user.setDisplayName`, `student.setPhone` → upsert/delete da linha de notas (`updatedAt = now`).
  - `@Transactional(readOnly = true) List<SharedNote> sharedWithMe()` (em `application/student`): notas compartilhadas dos professores do aluno atual, mais recentes primeiro, só `shared_notes`.
- **Controller**: novo `presentation/teacher/TeacherStudentController` (`@RequestMapping("/teacher")`) com as 4 rotas, para não inchar o `TeacherController`.
- **`PracticeUseCase.register(durationMin, date, notes, difficulty, rating)`**: grava os dois campos novos; XP sem mudança.

## 5. Mobile

**Aluno — observações do professor**
- `studentService.ts`: `teacherNotes()` → `GET /me/teacher-notes`.
- "Mais" do aluno ganha "Observações do professor" → nova tela `app/(student)/teacher-notes.tsx` (lista: nome do professor, data, texto; vazio: "Seus professores ainda não deixaram observações."). Fora do Figma; segue o estilo das telas do Stack do aluno (tab bar visível, aba ativa "Mais").

**Adição 5**
- `studentService.ts`: `StudentPractice` ganha `difficulty: string | null; rating: number | null`. `registerPractice({ durationMin, date, notes?, difficulty?, rating? })` passa a receber objeto.
- `practice/register.tsx`: remover `buildNotes`. Enviar `notes: what.trim() || undefined`, `difficulty: difficulty.trim() || undefined`, `rating: mood === null ? undefined : mood + 1`. `MAX_NOTES_LENGTH` (255) passa a valer só para "O que praticou".
- `practice/history.tsx`: avaliação vem de `practice.rating`. `practiceMood.ts` fica só com `practiceMoods` (sai `practiceRating`).
- `TeacherPracticeDetail.tsx`: `practice.notes || "Não informado"`, `practice.difficulty || "Não informado"`, `practice.rating`. `TeacherStudentDetail` (aba Prática): subtítulo `item.notes || "Sem observações"`. **Apagar `features/teacher/practiceNotes.ts`.**

**Adição 1**
- `teacherService.ts`: `instruments()`, `createStudent(b: NewTeacherStudent)`, `studentProfile(id)`, `updateStudentProfile(id, b)`. Tipos `TeacherStudentProfile`, `NewTeacherStudent`, `TeacherInstrument`.
- Novo `features/teacher/studentForm.ts` (puro, testado): `StudentFormValues`, ordem dos campos `FIELDS = ["name","email","username","password","phone","instrument","notes"]`, `validateStudentForm(values, mode)` devolvendo `Partial<Record<Field,string>>` em pt-BR. Mensagens: "Informe o nome.", "Informe um e-mail válido.", "Usuário sem espaços, até 100 caracteres.", "A senha precisa de 8 a 72 caracteres." (bytes via `TextEncoder`), "Telefone inválido.", "Escolha o instrumento.". Também `fieldFromApiError(error)` (detalhe "Email…" → `email`, "Username…" → `username`, "does not teach" → `instrument`).
- Nova tela `features/teacher/TeacherStudentForm.tsx` + rota fina `app/(teacher)/student-form.tsx` (param `id?`: sem id cadastra, com id edita). Adicionar `"student-form": "students"` em `activeTabs` (`app/(teacher)/_layout.tsx`).
  - Cadastro: Nome, E-mail, Usuário (login), Senha inicial (`secureTextEntry`, dica "Informe esta senha ao aluno."), Telefone (opcional), Instrumento (`ChipGroup` com `instruments()`; pré-seleciona se houver um só; se não houver nenhum: `ScreenState` "Você ainda não ensina nenhum instrumento cadastrado. Peça à administração."), "Observação para o aluno" (opcional, multiline, máx. 1000, legenda "O aluno vê esta observação.") e "Anotações do professor" (opcional, multiline, máx. 1000, legenda "Visível só para você.").
  - Edição: carrega `studentProfile(id)`. Nome, Telefone e as duas notas editáveis; E-mail e Usuário somente leitura.
  - Validação ao salvar: foca o primeiro campo inválido e rola até ele (padrão `fieldPositions` + `scrollTo` de `new-lesson.tsx`/`register.tsx`). Erro da API cai no campo via `fieldFromApiError`, senão no alerta do formulário com `apiErrorMessage`.
  - `useUnsavedChangesGuard(dirty)`: no cadastro, qualquer campo preenchido; na edição, diferente do perfil carregado. Chamar `markSaved()` antes de navegar. Depois de cadastrar: `router.replace` para `/(teacher)/student/[id]` + toast "Aluno cadastrado.". Depois de editar: `router.back()` + toast "Alterações salvas." (o detalhe recarrega ao ganhar foco via `useResource`).
  - Botão em estado de carregamento e campos desabilitados enquanto salva (evita cadastro em dobro).
- `errorMessage.ts` (`BY_DETAIL`): `/Email already in use/` → "Este e-mail já está em uso."; `/Username already in use/` → "Este usuário já está em uso.".
- `TeacherStudents.tsx`: `ScreenHeader action` = `IconButton icon="add" label="Novo aluno"` só se `useAuth().user?.authorities.includes("student.register")`. Texto do vazio: "Toque em + para cadastrar um aluno ou peça uma matrícula à administração."
- `TeacherStudentDetail.tsx`: `loadStudent` troca `teacherService.students()` por `studentProfile(id)` (nome + notas). No Resumo, cards "Observações" (compartilhada, com rótulo "O aluno vê") e "Anotações" (privada, rótulo "Só você vê") antes de "Próxima meta" (texto ou "Nenhuma observação"). Rodapé: no Resumo, "Editar aluno" (se tiver `student.update`) levando a `student-form?id=`; em Aulas, "Nova aula".

## 6. Testes

- **Unit (Surefire)** `application/teacher/TeacherStudentUseCaseTest` (Mockito):
  - `register` chama `createStudent` e depois `createEnrollment` com o id do professor atual.
  - Nota é gravada só quando não está em branco.
  - `update` sem vínculo ativo → `OwnershipException` e nada é salvo.
  - Observação em branco apaga a existente; os campos passam por trim.
  - ADMIN em `profile` → `notes` null.
- **IT** `teacher/TeacherStudentManagementIT`:
  - `GET /teacher/instruments` traz só os instrumentos do professor.
  - Cadastro com 200: o aluno aparece em `/teacher/students` e `/teacher/enrollments` e consegue logar com a senha inicial.
  - Instrumento que o professor não ensina → 422, e depois o mesmo username ainda pode ser usado (prova do rollback).
  - Username duplicado → 409 com detalhe; e-mail duplicado → 409; e-mail/senha/telefone inválidos → 422 `VALIDATION`.
  - `PUT` atualiza nome/telefone/notas e o `GET` reflete.
  - Outro professor matriculado (pelo admin) ao mesmo aluno: notas `null` para ele; grava as próprias; as do primeiro ficam intactas.
  - `GET /me/teacher-notes` (token do aluno) traz só `shared_notes` dos dois professores, nunca `private_notes`; professor e aluno de fora → 403 / lista vazia; token de professor → 403.
  - Professor não vinculado → 403 `OWNERSHIP_DENIED` em `GET`/`PUT`.
  - Matrícula inativa (via `JdbcTemplate`) → `PUT` 403.
  - Token de aluno em `POST /teacher/students` → 403 `ACCESS_DENIED`; admin puro → 403 `PROFILE_REQUIRED`.
- **IT** `admin/AdminRegistrationIT`: novo caso, username duplicado em `/admin/students` → 409 `DUPLICATE_RESOURCE`.
- **IT** `student/PracticeFeedbackIT`:
  - Registrar com `difficulty` e `rating` → aparecem em `/me/practices` e `/teacher/students/{id}/practices`.
  - Ganho de `xpTotal` igual com e sem os campos (mesma duração).
  - `rating` 0 e 6 → 422; `difficulty` com 256 chars → 422; `notes` com 501 → 422 (antes era 500).
  - Cliente legado só com `notes` → 200 com campos novos `null`.
- **IT** `student/PracticeNotesBackfillIT`: insere linhas legadas via `JdbcTemplate`, re-executa `db/migration/V15__practice_notes_backfill.sql` com `ResourceDatabasePopulator` (encoding UTF-8) e confere:

| `notes` antes | `notes` depois | `difficulty` | `rating` |
|---|---|---|---|
| `Escalas; Dificuldade: Acordes; Avaliação: 5/5` | `Escalas` | `Acordes` | 5 |
| `Escalas; arpejos; Dificuldade: troca; ritmo; Avaliação: 3/5` | `Escalas; arpejos` | `troca; ritmo` | 3 |
| `Escalas; Avaliação: 2/5` | `Escalas` | null | 2 |
| `Avaliação: 4/5` | null | null | 4 |
| `Dificuldade: pestana` | null | `pestana` | null |
| `Escalas\nmúsica nova; Dificuldade: x` | `Escalas\nmúsica nova` | `x` | null |
| `Arpejos livres` / `Avaliação: 9/5` | inalterado | null | null |
| `a; Dificuldade: ` + 300 chars | inalterado | null | null |

  Segunda execução: 0 linhas alteradas.
- **Jest**:
  - `features/teacher/__tests__/studentForm.test.ts` (cada regra; ordem do primeiro inválido; `fieldFromApiError`).
  - `app/__tests__/teacherStudentForm.test.tsx`: cadastro feliz → `createStudent` com o corpo certo e `replace` para o detalhe; e-mail inválido → foco/erro sem chamada; 409 de e-mail → erro sob "E-mail"; instrumento único pré-selecionado; zero instrumentos → estado vazio; edição carrega, salva `PUT` e volta; voltar com alteração → confirmação "Descartar alterações?".
  - `teacherStackNavigation.test.tsx`: `["/(teacher)/student-form", "Alunos"]`.
  - `teacherPractice.test.tsx`: card "Observações", "Editar aluno" no Resumo e "Nova aula" em Aulas, "+" só com `student.register`, fixtures com `difficulty`/`rating`.
  - `registerPractice.test.tsx`: espera `{ durationMin: 45, notes: "Escalas", rating: 4, date }`.
  - `practiceHistory.test.tsx`: avaliação vem de `rating`.
  - `errorMessage.test.ts`: as duas traduções novas.

## 7. Tarefas em ordem (cada lote = 1 commit na `main`)

| # | Lote | Arquivos (criar / alterar) | Validação |
|---|---|---|---|
| 1 | V13 + entidade/porta da nota | `V13__teacher_student_management.sql`, `TeacherStudentNote.java`, `TeacherStudentNoteRepository.java` | `./mvnw verify` (Flyway + `validate`) |
| 2 | Duplicidade explícita + `phone` em `createStudent`; extrair `Passwords`/`InstrumentOption` | `AdminRegistrationUseCase.java`, `AdminController.java`, `presentation/validation/Passwords.java`, `presentation/response/InstrumentOption.java`, `AdminRegistrationIT.java` | `-Dit.test=AdminRegistrationIT` |
| 3 | `StudentLinkGuard`; `TeacherUseCase` delega (sem mudar comportamento) | `StudentLinkGuard.java`, `TeacherUseCase.java` | `-Dit.test=TeacherFlowIT` |
| 4 | `TeacherStudentUseCase` + unit | `TeacherStudentUseCase.java`, `TeacherStudentUseCaseTest.java` | `-Dtest=TeacherStudentUseCaseTest` |
| 5 | Controller + DTOs + `GET /me/teacher-notes` + IT | `TeacherStudentController.java`, `StudentProfileResponse.java`, `SharedNoteResponse.java`, `StudentController.java`, `TeacherStudentManagementIT.java` | `./mvnw verify` |
| 6 | V14 + `Practice`/`PracticeResponse`/`RegisterPractice`/`PracticeUseCase` + IT | `V14__practice_difficulty_rating.sql`, `Practice.java`, `PracticeResponse.java`, `StudentController.java`, `PracticeUseCase.java`, `PracticeFeedbackIT.java` | `./mvnw verify` |
| 7 | V15 backfill + IT | `V15__practice_notes_backfill.sql`, `PracticeNotesBackfillIT.java` | `./mvnw verify` |
| 8 | Mobile prática do aluno | `studentService.ts`, `practice/register.tsx`, `practice/history.tsx`, `practiceMood.ts`, testes | `npx jest src/app/__tests__/registerPractice.test.tsx src/app/__tests__/practiceHistory.test.tsx && npx tsc --noEmit` |
| 9 | Mobile prática do professor; apagar `practiceNotes.ts` | `TeacherPracticeDetail.tsx`, `TeacherStudentDetail.tsx` (aba Prática), `teacherPractice.test.tsx` | `npx jest && npx tsc --noEmit` |
| 10 | Service + validação pura | `teacherService.ts`, `studentForm.ts`, `__tests__/studentForm.test.ts`, `errorMessage.ts` (+ teste) | `npx jest src/features/teacher src/lib` |
| 11 | Tela de formulário + rota + aba ativa | `TeacherStudentForm.tsx`, `app/(teacher)/student-form.tsx`, `app/(teacher)/_layout.tsx`, `teacherStudentForm.test.tsx`, `teacherStackNavigation.test.tsx` | `npx jest src/app/__tests__/teacherStudentForm.test.tsx` |
| 12 | "+" em Alunos; Observações e "Editar aluno" no Resumo; `loadStudent` via perfil | `TeacherStudents.tsx`, `TeacherStudentDetail.tsx`, testes | `npx jest && npx tsc --noEmit` |
| 12b | Aluno: "Observações do professor" em Mais | `studentService.ts`, `app/(student)/teacher-notes.tsx`, `app/(student)/(tabs)/more.tsx`, layout do Stack do aluno (aba ativa), teste | `npx jest && npx tsc --noEmit` |
| 13 | Docs + smoke manual (cadastrar pelo emulador, logar como o aluno, editar, conferir o backfill num banco dev com dados antigos) | `docs/modelo-de-dados.md` (tabela nova, colunas, 3 permissões), `docs/glossario-en.md` (dificuldade→`difficulty`, avaliação→`rating`, anotações do professor→`private_notes`, observação para o aluno→`shared_notes`, `student.register`/`student.update`/`note.read`), `CLAUDE.md` | manual |

## 8. Critérios de aceite

1. Professor com `student.register` vê "+" em Alunos, cadastra aluno com instrumento que ensina, o aluno aparece na lista e consegue logar com a senha inicial.
2. Cadastro com instrumento que o professor não ensina, ou com usuário/e-mail repetido, falha sem deixar usuário/aluno/matrícula órfãos. A mensagem aparece no campo certo, em pt-BR.
3. Resumo mostra Observações, Próxima meta e Data da matrícula; "Editar aluno" abre o formulário com os dados atuais; salvar reflete no Resumo.
4. Anotações privadas de um professor nunca aparecem para outro professor nem em rota `/me/**`; a observação compartilhada aparece para o aluno em "Mais → Observações do professor".
5. Sair do formulário com alteração pede confirmação; salvar não pede.
6. Nova prática grava `notes`, `difficulty` e `rating` separados; o professor vê os três sem parse; XP idêntico ao de antes.
7. Registros antigos na convenção aparecem separados depois do V15; os fora dela aparecem como antes em "O que praticou".
8. `./mvnw verify`, `npx jest` e `npx tsc --noEmit` verdes.

## Riscos e segurança

- **Criar login é privilégio**: role `STUDENT` fixa no servidor, permissão própria, sempre com matrícula do próprio professor.
- **Enumeração** de usuário/e-mail via 409: só para staff autenticado. Aceito no TCC; rate limit fica fora.
- **Nome editado é global** (o admin e outros professores veem). Sem trilha de auditoria; `updated_at` só existe na nota.
- **Permissões novas exigem refresh/novo login** (authorities no JWT). Avisar no smoke.
- **Backfill**: depende de UTF-8 no arquivo (Flyway usa UTF-8 por padrão) e do `.` casar quebra de linha (padrão do Postgres). Os dois pontos são cobertos pelo `PracticeNotesBackfillIT`.
- **App antigo** mandando `notes` concatenado depois do deploy: o texto aparece cru (sem perda). Aceito (D12).
- Aluno só com matrícula inativa: o professor vê, mas o `PUT` dá 403 ("Sem permissão para acessar este registro").
- Se outra entrega criar V13 antes, renumerar V13–V15 antes de aplicar.

## Decisões do dono (2026-10-14)

1. ~~O aluno deve ver as observações?~~ **Decidido:** dois campos — anotações privadas do professor e observação compartilhada que o aluno lê (D4).
2. ~~Forçar troca de senha no primeiro acesso?~~ **Decidido: não agora.** exige flag em `auth_user` + endpoint de troca da própria senha + tela. A redefinição pelo admin já cobre a perda de senha.
3. ~~Professor corrige e-mail?~~ **Decidido: não.** com reset de senha por e-mail, isso abre tomada de conta. A correção fica com o admin.
4. ~~Admin lê as notas de todos?~~ **Decidido: futuro.** hoje ele recebe as notas como `null`. Se a escola exigir, adicionar depois `GET /admin/students/{id}/notes`, listando por professor.
