# Plano: "Anexe sua prática" (uma gravação de áudio/vídeo por prática)

> Planejado pelo agente architect em 2026-10-12; executado pelo Codex com gates de verificação do Claude.
> Nada exige tabela, permissão ou dependência nova — reusa `FileStoragePort`, o fluxo multipart de materiais, `postForm`/`getBytes`, `saveDownload`, `formatFileSize` e `expo-document-picker`.

## Achados que o plano assume

- **Limite de upload hoje é 1 MB.** `application.yml` não define `spring.servlet.multipart.*` → padrão do Spring (1 MB arquivo / 10 MB request). Vídeo falha até configurar.
- **Timeout único de 20 s** no `apiClient` (`DEFAULT_TIMEOUT_MS`) vale também para `postForm`/`getBytes` — 50 MB em rede móvel estoura.
- **Sem handler para `MaxUploadSizeExceededException`**, e o `max-swallow-size` do Tomcat (2 MB) derruba a conexão em corpo grande → cliente vê "Sem conexão" em vez de 413.
- **Não existe exclusão de prática** → só a troca de gravação precisa de limpeza.
- **Professor já vê práticas** via `TeacherUseCase.studentDetail` → `recentPractices` (`Map.of`, rejeita null, sem id) — adiciona-se endpoint com DTO em vez de mexer nele.
- **A UI nova precisa do id da prática** retornado por `POST /me/practices`.
- **Sem proteção contra duplo envio** no registro → toque duplo = XP em dobro.

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D1 | **Upload em endpoint separado, depois da criação.** `POST /me/practices` continua JSON; `POST /me/practices/{id}/recording` (multipart) define/substitui o arquivo. | Registrar prática **não é idempotente** (XP, sequência, minutos). Separar evita perder a prática ou dar XP em dobro se o upload falhar; o upload pode ser repetido sem efeito na gamificação. POST (não PUT) para reaproveitar `postForm` e `multipart()` do MockMvc; o servidor trata como substituição. |
| D2 | **Tipos aceitos: qualquer `audio/*` ou `video/*`**, parte `file`. Vazio é rejeitado. Mobile deduz o MIME pela extensão quando o seletor não informa. | Formatos de celular variam (mp4, mov, m4a, 3gp, webm, aac, mp3, wav, ogg). Download sempre `application/octet-stream` + `nosniff` do Spring Security. Checagem de magic bytes fica fora (TCC). |
| D3 | **Máx. 50 MB, em 3 camadas**: (a) mobile ao escolher (`RECORDING_MAX_BYTES` em `src/features/student/recording.ts`); (b) Spring `max-file-size: 50MB`, `max-request-size: 51MB`, `server.tomcat.max-swallow-size: 60MB` → 413 `FILE_TOO_LARGE`; (c) regra de domínio `PracticeRecordingRule.MAX_BYTES` → 422 `DOMAIN_VALIDATION`. | Bate com o Figma ("50 MB"). O limite do Spring é global → materiais também sobem para 50 MB; atualizar o texto do `MaterialUpload`. |
| D4 | **Timeout de 5 min para mídia no mobile**: `{ timeoutMs }` opcional em `postForm`/`getBytes`; `MEDIA_TIMEOUT_MS = 300_000`. | 50 MB em 3G leva minutos. |
| D5 | **Chave de storage no formato atual** `<uuid>_<nome sanitizado>` via `storage.save(name, bytes)`. | Já é única e nunca exposta (cliente só vê o id da prática). |
| D6 | **Substituição apaga o arquivo antigo só após o commit**; em rollback apaga o novo. `TransactionSynchronization.afterCompletion`. Adicionar `void delete(String storagePath)` ao `FileStoragePort` (`Files.deleteIfExists`). | Apagar antes do commit deixaria o registro apontando para arquivo inexistente. |
| D7 | **Gravação em colunas 1:1 de `practice`**, mapeadas como `@Embeddable` (null quando sem arquivo). | Requisito é "um arquivo"; tabela filha é desnecessária. |
| D8 | **Sem permissão nova.** Upload do aluno: `practice.register`. Download do aluno: `progress.read`. Lista/download do professor: `student.read`. ADMIN já tem todas. | Segue os nomes existentes; sem migration de seed. |
| D9 | **Estado "enviando" em vez de barra de %.** | `fetch` não expõe progresso de upload. |
| D10 | **Fora de escopo:** campo de feedback escrito do professor na prática. | Não pedido como dado. |

**Dependência:** a resposta de `POST /me/practices` **precisa ter `practiceId` (UUID)** no topo, ao lado dos campos de progresso. A Tarefa 0 confere e adiciona.

## 2. Modelo de dados

`backend/harmonia-app/src/main/resources/db/migration/V12__practice_recording.sql` (V11 é a última — confirmar antes):

```sql
ALTER TABLE practice
    ADD COLUMN recording_file_name    VARCHAR(255),
    ADD COLUMN recording_storage_path VARCHAR(500),
    ADD COLUMN recording_content_type VARCHAR(120),
    ADD COLUMN recording_size_bytes   BIGINT,
    ADD COLUMN recording_uploaded_at  TIMESTAMP;

ALTER TABLE practice ADD CONSTRAINT ck_practice_recording_complete CHECK (
    (recording_storage_path IS NULL AND recording_file_name IS NULL AND recording_content_type IS NULL
        AND recording_size_bytes IS NULL AND recording_uploaded_at IS NULL)
    OR
    (recording_storage_path IS NOT NULL AND recording_file_name IS NOT NULL AND recording_content_type IS NOT NULL
        AND recording_size_bytes > 0 AND recording_uploaded_at IS NOT NULL)
);
```

Novo `infrastructure/persistence/gamification/PracticeRecording.java`:

```java
@Embeddable
@Getter @NoArgsConstructor @AllArgsConstructor
public class PracticeRecording {
    @Column(name = "recording_file_name") private String fileName;
    @Column(name = "recording_storage_path") private String storagePath;
    @Column(name = "recording_content_type") private String contentType;
    @Column(name = "recording_size_bytes") private Long sizeBytes;
    @Column(name = "recording_uploaded_at") private LocalDateTime uploadedAt;
}
```

`Practice.java`: `@Embedded private PracticeRecording recording;` (getter/setter via Lombok). Repositórios: sem mudança (`findById`, `findTop100ByStudentIdOrderByDateDescCreatedAtDesc`).

## 3. Endpoints

| Método + rota | Authority | Ownership | Request | Response |
|---|---|---|---|---|
| `POST /me/practices` (existente) | `practice.register` | aluno atual | JSON (igual) | DTO **com `practiceId`** |
| `POST /me/practices/{id}/recording` (multipart) | `practice.register` | `current.assertOwnedByCurrentStudent(practice.getStudent())` (ADMIN bypass) | parte `file` | `PracticeResponse` |
| `GET /me/practices` (existente) | `progress.read` | aluno atual | – | `List<PracticeResponse>` (agora com `recording`) |
| `GET /me/practices/{id}/recording` | `progress.read` | `assertOwnedByCurrentStudent` | – | `byte[]`, `application/octet-stream` |
| `GET /teacher/students/{id}/practices` | `student.read` | professor vinculado (`TeacherUseCase.assertLinked`, ADMIN bypass) | – | `List<PracticeResponse>` (top 100) |
| `GET /teacher/practices/{id}/recording` | `student.read` | `enrollments.findByTeacherIdAndStudentId(currentTeacher, practice.student)` não vazio, ou ADMIN | – | `byte[]`, `application/octet-stream` |

Novo `presentation/response/PracticeResponse.java` (substitui o record aninhado em `StudentController`):

```java
public record PracticeResponse(UUID id, LocalDate date, int durationMin, String notes, Recording recording) {
    public record Recording(String fileName, String contentType, long sizeBytes, LocalDateTime uploadedAt) {}
    public static PracticeResponse of(Practice p) {
        var r = p.getRecording();
        return new PracticeResponse(p.getId(), p.getDate(), p.getDurationMin(), p.getNotes(),
            r == null ? null : new Recording(r.getFileName(), r.getContentType(), r.getSizeBytes(), r.getUploadedAt()));
    }
}
```

`storagePath` nunca é exposto.

| Caso | Status / código |
|---|---|
| Prática inexistente | 404 `NOT_FOUND` (`ResourceNotFoundException("Practice")`) |
| Sem gravação (download) | 404 `NOT_FOUND` (`ResourceNotFoundException("Recording")`) |
| Prática de outro aluno / professor não vinculado | 403 `OWNERSHIP_DENIED` |
| Sem authority | 403 `ACCESS_DENIED` |
| Tipo errado / vazio / > 50 MB (domínio) | 422 `DOMAIN_VALIDATION` — `"Recording must be an audio or video file"`, `"Recording is empty"`, `"Recording exceeds 50 MB"` |
| Acima do limite do Spring | **Novo** handler em `GlobalExceptionHandler`: `MaxUploadSizeExceededException` → 413 `FILE_TOO_LARGE`, `"File exceeds the upload limit"` |

## 4. Aplicação / domínio

- **Novo `domain/gamification/PracticeRecordingRule.java`** (Java puro): `MAX_BYTES = 50L * 1024 * 1024`; `validate(contentType, sizeBytes)` lança `lessoncore.DomainValidationException` (vazio → "Recording is empty"; > MAX → "Recording exceeds 50 MB"; null ou não `audio/`/`video/` → "Recording must be an audio or video file").
- **`FileStoragePort`**: `void delete(String storagePath);` — `LocalStorageAdapter`: `Files.deleteIfExists(root.resolve(storagePath))`, `IOException` → `UncheckedIOException`.
- **Novo `application/gamification/PracticeRecordingUseCase.java`** (`PracticeRepository`, `EnrollmentRepository`, `FileStoragePort`, `CurrentUserService`):
  - `@Transactional Practice attach(UUID practiceId, MultipartFile file)`: carrega (404) → `assertOwnedByCurrentStudent` → `PracticeRecordingRule.validate` → `newPath = storage.save(...)` → guarda `oldPath` → `setRecording(new PracticeRecording(...))` + `save` → `registerSynchronization(afterCompletion: COMMITTED ? delete(oldPath se houver) : delete(newPath))` → retorna. Comentário `ponytail:` em `getBytes()` (arquivo inteiro em memória; trocar por InputStream se crescer).
  - `@Transactional(readOnly = true) byte[] downloadMine(UUID)`: carrega, ownership, exige gravação, `storage.read`.
  - `@Transactional(readOnly = true) byte[] downloadAsTeacher(UUID)`: carrega; se não ADMIN exige matrícula professor↔aluno, senão `OwnershipException("Student is not linked to this teacher")`; exige gravação; lê.
- **`TeacherUseCase`**: `List<Practice> studentPractices(UUID studentId) { assertLinked(studentId); return practices.findTop100ByStudentIdOrderByDateDescCreatedAtDesc(studentId); }`.
- **Controllers**: `StudentController` (`uploadRecording`, `downloadRecording`; `practices()` usa o novo `PracticeResponse`); `TeacherController` (`studentPractices`, `downloadPracticeRecording`). Downloads: `ResponseEntity.ok().contentType(APPLICATION_OCTET_STREAM).body(...)`, como materiais.
- **`application.yml`**:

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 50MB
      max-request-size: 51MB
server:
  tomcat:
    max-swallow-size: 60MB   # lets Tomcat drain an oversized body so the 413 reaches the client
```

Confirmar os nomes no Boot 4 (Context7) antes do commit.

## 5. Mobile

- **`src/lib/http/formFile.ts`**: `PickedFile = { uri; name; mimeType?; size?; file?: Blob }` e `appendFile(form, field, file)`; mover o ramo web/nativo de `teacherService.uploadMaterial` para cá.
- **`apiClient.ts`**: timeout por chamada em `dispatch` (padrão `timeoutMs`); `requestForm(path, form, opts?)`, `getBytes(p, opts?)`, `postForm(p, form, opts?)`. Exportar `MEDIA_TIMEOUT_MS = 300_000` em `src/lib/http/index.ts`.
- **`src/features/student/recording.ts`** (puro, testado): `RECORDING_MAX_BYTES`; `recordingMimeType(name, mimeType?)` (mantém `audio/*`/`video/*`; senão extensão: mp4→video/mp4, mov→video/quicktime, webm→video/webm, 3gp→video/3gpp, m4a→audio/mp4, mp3→audio/mpeg, aac→audio/aac, wav→audio/wav, ogg→audio/ogg; desconhecido → null); `recordingError(file)` → "Escolha um arquivo de áudio ou vídeo." / "O arquivo passa de 50 MB. Grave um vídeo mais curto ou envie só o áudio." / "O arquivo está vazio.".
- **`studentService.ts`**: `StudentPractice.recording: { fileName; contentType; sizeBytes; uploadedAt } | null`; `registerPractice` retorna também `practiceId`; `uploadPracticeRecording(practiceId, file)` (postForm, `MEDIA_TIMEOUT_MS`); `downloadPracticeRecording(id)` (getBytes, `MEDIA_TIMEOUT_MS`).
- **`practice/register.tsx`** (extrair `PracticeRecordingPicker` se passar de ~300 linhas): bloco "Anexe sua prática (opcional)" antes da avaliação — sem arquivo: botão secundário "Escolher áudio ou vídeo" (`DocumentPicker.getDocumentAsync({ type: ["audio/*", "video/*"], copyToCacheDirectory: true })`); com arquivo: ícone (`videocam-outline` / `musical-note-outline`), `${name} · ${formatFileSize(size)}`, botões "Trocar" e "Remover" com labels acessíveis; legenda "Áudio ou vídeo, até 50 MB."; falha do seletor → toast "Não foi possível abrir o seletor de arquivos.".
  - `save()`: retorna se `saving`; se ainda não salvou → `registerPractice`, `markSaved()`, guarda `{ practiceId, progress }` (**nunca chama de novo** = proteção contra XP dobrado); se há arquivo → `uploadPracticeRecording`; falha → `apiErrorMessage(cause, "A prática foi salva, mas o arquivo não foi enviado.")` + "Tentar enviar de novo" (só o upload) e "Continuar sem arquivo" (mostra a recompensa).
  - Botão: `"Enviando arquivo…"` durante upload, `loading={saving}`; campos desabilitados enquanto salva; legenda "Arquivos grandes podem levar alguns minutos.".
  - `errorMessage.ts`: `FILE_TOO_LARGE` → "Arquivo maior que 50 MB"; detalhes de domínio mapeados para pt-BR.
- **Histórico** (`PracticeOverview` e `practice/history`): com `recording`, linha pressionável `${fileName} · ${tamanho}`, `accessibilityLabel="Baixar gravação ${fileName}"`, baixa via `saveDownload` com toast de sucesso/erro e trava por linha (padrão de `materials.tsx`).
- **Professor**: `teacherService.studentPractices(id)` e `downloadPracticeRecording(id)`; `TeacherStudentDetail` carrega as práticas pelo novo endpoint (aba prática usa `practices.slice(0, 10)`), mostra "Gravação: nome · tamanho" e baixa ao tocar; `recentPractices` do backend fica intacto (usado em `/teacher/reports`). `MaterialUpload`: texto "PDF, imagem, áudio ou partitura, até 50 MB.".

## 6. Testes

- **Unit (Surefire)**: `PracticeRecordingRuleTest` (aceita `video/mp4`, `audio/mpeg`, exatamente `MAX_BYTES`; rejeita `application/pdf`, null, 0 bytes, `MAX_BYTES + 1`); `PracticeRecordingUseCaseTest` (Mockito, estilo `TeacherMaterialUseCaseTest`, `TransactionSynchronizationManager.initSynchronization()`/`clear()`): outro aluno → `OwnershipException` sem tocar storage; tipo inválido → sem `save`; caminho feliz; substituição + commit apaga o antigo; rollback apaga o novo; `downloadMine` sem gravação → 404; professor não vinculado → `OwnershipException`.
- **IT (Failsafe/Testcontainers/JsonPath)** `student/PracticeRecordingIT.java`: registrar → `$.practiceId`; upload `video/mp4` → 200 e sem `$.recording.storagePath`; `xpTotal` inalterado após upload; lista com `sizeBytes`; download devolve os bytes; PDF → 422; segundo upload substitui; outro aluno → 403 `OWNERSHIP_DENIED`; professor vinculado lista e baixa; não vinculado → 403; token de professor no upload do aluno → 403 `ACCESS_DENIED`; id inexistente → 404. (413 não é testável no MockMvc — coberto pela regra + Postman manual.)
- **Jest**: `features/student/__tests__/recording.test.ts`; `lib/http/__tests__/apiClient.test.ts` (override de `timeoutMs`); `app/__tests__/registerPractice.test.tsx` (escolher → "Prática.mp4 · 50,0 MB" → registrar e enviar; falha no upload → "Tentar enviar de novo" chama só o upload; arquivo grande → erro sem chamada; "Remover"); `app/__tests__/studentPractice.test.tsx` (linha da gravação baixa); `lib/http/__tests__/errorMessage.test.ts`.

## 7. Tarefas em ordem

| # | Tarefa | Arquivos | Validação |
|---|---|---|---|
| 0 | Garantir `practiceId` na resposta de `POST /me/practices` (se faltar: `PracticeUseCase.register` retorna `PracticeRegistration(practice, progress)`) | `PracticeUseCase.java`, `StudentController.java`, DTO, `StudentFlowIT.java` | `./mvnw verify -pl harmonia-app -am -Dit.test=StudentFlowIT` |
| 1 | V12 + `PracticeRecording` + `Practice.recording` | migration, `PracticeRecording.java`, `Practice.java` | `./mvnw verify` |
| 2 | `PracticeRecordingRule` + teste | `PracticeRecordingRule.java`, `PracticeRecordingRuleTest.java` | `./mvnw -pl harmonia-app -am test -Dtest=PracticeRecordingRuleTest` |
| 3 | `FileStoragePort.delete` | `FileStoragePort.java`, `LocalStorageAdapter.java` | `./mvnw -pl harmonia-app -am compile` |
| 4 | `PracticeRecordingUseCase` + teste; `TeacherUseCase.studentPractices` | idem | `-Dtest=PracticeRecordingUseCaseTest` |
| 5 | `PracticeResponse` + 3 endpoints aluno e 2 professor | `PracticeResponse.java`, controllers | compile |
| 6 | Limites multipart + handler `FILE_TOO_LARGE` | `application.yml`, `GlobalExceptionHandler.java` | compile |
| 7 | `PracticeRecordingIT` | `src/test/java/br/com/harmonia/student/PracticeRecordingIT.java` | `./mvnw verify` |
| 8 | Mobile http: `formFile.ts`, timeout, `MEDIA_TIMEOUT_MS`, refactor `uploadMaterial`, mensagens | `src/lib/http/*`, `teacherService.ts` | `npx jest src/lib && npx tsc --noEmit` |
| 9 | `recording.ts` + service | `src/features/student/*` | `npx jest src/features/student` |
| 10 | Tela de registro (seletor, linha do arquivo, estado enviando, proteção XP, retry) | `register.tsx` (+ `PracticeRecordingPicker.tsx`) | `npx jest src/app/__tests__/registerPractice.test.tsx` |
| 11 | Download no histórico do aluno | `PracticeOverview.tsx`, `practice/history.tsx` | `npx jest src/app/__tests__/studentPractice.test.tsx` |
| 12 | Aba prática do professor com download; texto do `MaterialUpload` | `teacherService.ts`, `TeacherStudentDetail.tsx`, `MaterialUpload.tsx` | `npx jest && npx tsc --noEmit` |
| 13 | Smoke manual (mp4 ~40 MB pelo emulador; 60 MB via Postman → 413; download do professor) + CLAUDE.md | `CLAUDE.md` | manual |

## Riscos

- ~~Nomes das propriedades no Boot 4~~ — **validado via Context7 (Boot 4.0.3)**: `spring.servlet.multipart.max-file-size`/`max-request-size` (`MultipartProperties`, padrão 1MB/10MB) e `server.tomcat.max-swallow-size` (`TomcatServerProperties`, padrão 2MB) existem com esses nomes.
- Memória: até 50 MB por request no servidor e no `ArrayBuffer` do download mobile — ok para TCC; streaming é o upgrade.
- Android pode não informar `mimeType`/`size` — extensão cobre o tipo; sem tamanho, o servidor valida.
- Refresh de token reenvia o multipart inteiro (já acontece com materiais).
- Limite global sobe para 50 MB também em materiais.
- Se outra entrega criar V12 antes, renomear este arquivo antes de aplicar.
