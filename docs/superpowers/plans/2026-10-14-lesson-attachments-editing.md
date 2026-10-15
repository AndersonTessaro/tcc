# Plano — Adição 1: anexos e edição de aula (professor)

> Architect, 2026-10-14. Só planejamento. Última migration = **V15** → este plano começa em **V16**.
> Pedido do dono: "anexos e edição de aula. os anexos vai ser utilizado o google drive para armazenar os arquivos, mas por hora não tenho o token ainda".

## 0. O que já existe (achados que o plano assume)

- **Tabela e entidade já existem.** `V4__lessons_materials.sql:24` cria `lesson_attachment` (`id`, `lesson_id` FK `ON DELETE CASCADE`, `file_name`, `storage_path`, `content_type`, `size_bytes`, `created_at`) — sem índice em `lesson_id`, `content_type`/`size_bytes` nuláveis, **nada escreve nela hoje** (nenhum seed/IT/endpoint). Entidade `infrastructure/persistence/lesson/LessonAttachment.java`; porta `application/lesson/port/LessonAttachmentRepository.java` só com `findByLessonId`.
- **Leitura do aluno já existe, sem download.** `GET /me/lessons/{id}` (`StudentController.lessonDetail`) devolve `{lesson, attachments}` com `AttachmentResponse` (`id, fileName, contentType, sizeBytes, createdAt`). `mobile/src/app/(student)/lesson/[id].tsx` lista anexos sem botão de baixar e com legenda "Disponível com o professor". `studentService.LessonAttachment` não tem `contentType`.
- **Máquina de upload da prática reaproveitável.** `infrastructure/storage/FileStoragePort.java` (`save(fileName, bytes)`, `read(path)`, `delete(path)`), única impl `LocalStorageAdapter.java` (`@Component`, `app.storage.local-dir`). `PracticeRecordingUseCase.attach` grava no storage dentro da transação; `TransactionSynchronization` apaga o novo no rollback e o antigo após commit. Download = `byte[]` `application/octet-stream`. Validação em `domain/gamification/PracticeRecordingRule.java` (tamanho, content-type, extensão, magic bytes). `GlobalExceptionHandler` mapeia `MaxUploadSizeExceededException` → 413 `FILE_TOO_LARGE`. `application.yml`: `max-file-size: 50MB`, `max-request-size: 51MB`, `max-swallow-size: 60MB`.
- **Materiais (`TeacherMaterialUseCase.attach`) não validam nada** — aceitam qualquer arquivo. Fora de escopo (registrado no §9).
- **Não existe edição de aula.** `TeacherController` tem só `POST /teacher/lessons`, `PATCH /teacher/lessons/{id}/status`, `GET /teacher/lessons/availability`, agenda e histórico. Não existe `GET /teacher/lessons/{id}` nem tela de detalhe de aula do professor; `TeacherStudentDetail.tsx:106` e `history.tsx:91` levam à agenda do dia.
- **`LessonSchedulingGuard.assertSlotIsFree` monta o candidato com `UUID.randomUUID()`** → num reagendamento a própria aula seria conflito. `SchedulingPolicy.validateLessonSlot` já ignora o mesmo `lessonId`; basta passar o id real. A prévia `availability(...)` também lista a própria aula como ocupada.
- **lesson-core:** `LessonLifecyclePolicy` = `SCHEDULED -> DONE | CANCELED` (terminais), `initialStatus` = DONE se data ≤ hoje. `AttendanceRecordingRule`: frequência só a partir do dia da aula, nunca em CANCELED. `MakeupUseCase` copia `content` da original; vínculo `makeup_lesson` por id.
- **Bug latente:** `lesson.content`/`lesson.homework` são `VARCHAR(1000)`, mas o mobile usa `maxLength={2000}` (`new-lesson.tsx:200-201`) e `NewLesson` não tem `@Size` → texto > 1000 gera `22001` → 500. Corrigido aqui.
- **Permissões existentes bastam** (sem migration): `lesson.manage` (TEACHER, ADMIN), `lesson.read` (TEACHER, STUDENT, ADMIN — V2). `assertOwnedByCurrentTeacher`/`assertOwnedByCurrentStudent` já liberam ADMIN (RN13).
- **Mobile:** `api` tem `postForm` e `getBytes`, **não tem DELETE** (204 já tratado em `apiClient.ts:98`). Existem `appendFile`/`PickedFile` (`lib/http/formFile.ts`), `saveDownload` (`lib/files/saveDownload.ts`), `useUnsavedChangesGuard`, `confirm`, `expo-document-picker` (em `MaterialUpload.tsx`). `(teacher)/_layout.tsx` tem o mapa `activeTabs` — rota nova precisa de entrada.
- **Figma:** `docs/audit/figma/26-prof-nova-aula.png` = Data, Conteúdo, Tarefa, **Anexos** (lista nome + tamanho), "+ Adicionar anexo", "Salvar aula". **Não há campo "exercícios"** — entram na tarefa. `24-prof-aluno-aulas.png` mostra cada aula com "N anexos" e seta (a aula abre uma tela).

## 1. Decisões

| # | Decisão | Motivo | Rejeitado |
|---|---|---|---|
| D1 | **Editáveis:** `content` e `homework` em SCHEDULED e DONE; `date`/`startTime`/`endTime` **só em SCHEDULED**; matrícula (aluno) **nunca**. CANCELED = só leitura (422). | Professor preenche o conteúdo depois da aula (DONE). Data de aula DONE ancora frequência, XP e reposição. Trocar aluno = cancelar e criar outra. | Editar aluno (frequência/XP no aluno errado); editar CANCELED. |
| D2 | **Reagendamento no lesson-core:** `LessonLifecyclePolicy.validateReschedule(current, newDate, today, hasAttendance)` recusa status ≠ SCHEDULED, data antes de hoje, aula com frequência. Reagendada **continua SCHEDULED**. | Regra pura, testável sem Spring. Bloquear com frequência evita presença numa data em que a aula não aconteceu e não mexe no XP. | Mover frequência/estornar XP; reaplicar `initialStatus`. |
| D3 | **Checagem de conflito só se data/hora mudarem**, com o **id real**: sobrecarga `assertSlotIsFree(enrollment, lessonId, ...)`; chamadores atuais seguem com id aleatório. `availability` ganha `lessonId` opcional p/ excluir a própria aula. | A política já ignora o próprio id. Editar só texto não pode falhar por conflito surgido depois. | Duplicar a lógica do guard. |
| D4 | **Reposição (RN10):** nada muda. Original é DONE/CANCELED (data travada); reposição (SCHEDULED) pode ser reagendada; vínculo por id segue. Conteúdo da original **não** propaga. | Sem regra nova. | Sincronizar conteúdo. |
| D5 | **`PUT /teacher/lessons/{id}`** com o conjunto inteiro `{content, homework, date, startTime, endTime}`. Em DONE o cliente reenvia data/hora atuais (diferente → 422). `lesson.manage` + `assertOwnedByCurrentTeacher` (admin passa). Reagendar exige matrícula ativa (`EnrollmentRules.requireActive`); só texto não. | Formulário manda tudo; casa com `PUT /teacher/students/{id}/profile`. | PATCH com opcionais; permissão `lesson.update`. |
| D6 | **`@Size(max = 1000)`** em `content`/`homework` (`NewLesson`, `UpdateLesson`) e `maxLength={1000}` no mobile. | Corrige o 500 latente. | Aumentar a coluna. |
| D7 | **Tipos:** PDF; imagem (JPEG, PNG, WebP, HEIC/HEIF); áudio/vídeo do conjunto da prática. **50 MB/arquivo**, **máx. 10 por aula**. Validação por nome + content-type + magic bytes. | Partitura/exercício = PDF ou foto; áudio/vídeo como exemplo. HEIC = câmera do iPhone (`ftyp` já reconhecido). | MusicXML/Guitar Pro/Office (adicionar sob demanda); limite diferente do multipart. |
| D8 | **Extrair `domain/common/FileSignatures`** (`isMedia`, `isPdf`, `isImage`) de `PracticeRecordingRule` (que passa a delegar, sem mudar comportamento). Nova `domain/lesson/LessonAttachmentRule.validate(fileName, contentType, size, head, currentCount)`. | Uma fonte de assinaturas; teste da prática prova que nada quebrou. | Copiar assinaturas; regra genérica parametrizada. |
| D9 | **Enviar/remover:** professor dono com `lesson.manage` (admin passa); nunca em CANCELED (422). **Listar/baixar:** professor dono (`lesson.read`), aluno da aula (`lesson.read` + `assertOwnedByCurrentStudent`, RN11), admin. | RN06/11/12/13 com permissões existentes. | Aluno enviar anexo de aula. |
| D10 | **Download sempre pelo backend** (`byte[]`). Arquivo no Drive **privado** (sem "anyone with link"); `storage_path` (id do Drive) nunca sai na API. | Link público vaza (fere RN11). Backend no meio = troca de provedor transparente ao app. | `webContentLink`; URL assinada (Drive não tem). |
| D11 | **Um arquivo por requisição:** `POST /teacher/lessons/{id}/attachments` (multipart `file`). Na criação, o app **cria a aula e depois envia os anexos em sequência** (mesmo padrão da frequência em `new-lesson.tsx:156`). | Mesmo endpoint p/ criar e editar; falha num anexo não desfaz a aula. | `POST /teacher/lessons` multipart com N arquivos. |
| D12 | **Envio:** valida → storage → insere linha; rollback apaga o objeto. **Remoção:** apaga a linha na transação e o objeto **após commit**; falha no storage só gera log (órfão privado). Helper `application/storage/StorageTransactions` (`deleteOnRollback`, `deleteAfterCommit`), também adotado por `PracticeRecordingUseCase`. | Banco e Drive não compartilham transação; padrão já provado no repo; órfão privado é inofensivo. | Saga/outbox; apagar objeto antes do commit. |
| D13 | **Sem coluna `uploaded_by`.** Só professor da aula ou admin envia; a matrícula identifica o professor. | YAGNI. | — |
| D14 | **Uma porta, dois adaptadores por propriedade:** `app.storage.provider` = `local` (padrão) \| `google-drive` (`@ConditionalOnProperty`). `FileStoragePort` **não muda de assinatura** (Drive guarda como `application/octet-stream`; tipo real no banco). **Prática e materiais vão para o Drive na mesma chave** (mesmo bean). | Zero mudança nos três casos de uso; uma configuração. | Porta por funcionalidade; mime na assinatura. |
| D15 | **Arquivos locais existentes não migram.** Após a troca, `storage_path` antiga (`uuid_nome`) não existe no Drive e a leitura falha. **Trocar antes de haver dados reais.** | São dados de dev. | Adaptador roteador por prefixo. |
| D16 | **Erro do provedor** (rede, 5xx, 401/403, cota) → `StorageUnavailableException` → **503 `STORAGE_UNAVAILABLE`**. Sem retentativa automática. | Sem isso vira 500 opaco. | Backoff (adicionar se aparecer 429). |
| D17 | **Mobile:** extrair `features/teacher/LessonForm.tsx` de `new-lesson.tsx`, modo edição por `id` (padrão de `TeacherStudentForm`). Nova rota `(teacher)/lesson/[id].tsx` = detalhe + edição da aula (Figma 24 → 26). **Anexos escolhidos ficam pendentes até "Salvar aula"**; remover anexo já enviado é imediato, com confirmação. | Uma tela cobre detalhe + editar + anexos; "Salvar" com sentido único. | Detalhe separado da edição; enviar ao escolher. |

**"Exercícios" (Figma):** sem campo próprio — o Figma 26 os põe em "Tarefa para casa". `lesson.notes` segue sem uso.

## 2. API

| Método | Caminho | Permissão | Request | Response | Erros |
|---|---|---|---|---|---|
| GET | `/teacher/lessons/{id}` | `lesson.read` | — | `LessonDetailResponse {lesson: LessonResponse, attachments: AttachmentResponse[]}` | 404 `NOT_FOUND`; 403 `OWNERSHIP_DENIED`/`PROFILE_REQUIRED` |
| PUT | `/teacher/lessons/{id}` | `lesson.manage` | `UpdateLesson {@NotNull date, @NotNull startTime, @NotNull endTime, @Size(max=1000) content, @Size(max=1000) homework}` | `LessonResponse` | 404; 403; 409 `SCHEDULE_CONFLICT`; 422 `DOMAIN_VALIDATION` (cancelada, reagendar fora de SCHEDULED, data passada, frequência registrada, `TimeRange` inválido, matrícula inativa); 422 `VALIDATION` |
| GET | `/teacher/lessons/availability?…&lessonId=` | `lesson.manage` | `lessonId` opcional exclui a própria aula de `busy`/`conflicts` | `AvailabilityResponse` | iguais aos de hoje |
| POST | `/teacher/lessons/{id}/attachments` | `lesson.manage` | multipart `file` | `AttachmentResponse` | 404; 403; 413 `FILE_TOO_LARGE`; 422 `DOMAIN_VALIDATION` (tipo, vazio, > 10, cancelada); 503 `STORAGE_UNAVAILABLE` |
| DELETE | `/teacher/lessons/{id}/attachments/{attachmentId}` | `lesson.manage` | — | 204 | 404 (inclusive anexo de outra aula); 403; 422 (cancelada) |
| GET | `/teacher/lessons/{id}/attachments/{attachmentId}` | `lesson.read` | — | `application/octet-stream` | 404; 403; 503 |
| GET | `/me/lessons/{id}/attachments/{attachmentId}` | `lesson.read` | — | `application/octet-stream` | 404; 403 `OWNERSHIP_DENIED`; 503 |
| GET | `/me/lessons/{id}` | `lesson.read` | — | mesmo JSON de hoje, via record `LessonDetailResponse` | — |

- `attachmentId` sempre resolvido **dentro** da aula do caminho; anexo de outra aula → 404 (impede trocar id para alcançar anexo alheio).
- Mensagens novas (inglês; mobile traduz por regex em `lib/http/errorMessage.ts`): `Canceled lessons cannot be edited` · `Only scheduled lessons can be rescheduled` · `Lesson cannot be moved to a past date` · `Lesson with recorded attendance cannot be rescheduled` · `Attachment must be a PDF, image, audio or video file` · `Attachment is empty` · `Attachment exceeds 50 MB` · `Lesson already has 10 attachments`.

## 3. Modelo de dados

`V16__lesson_attachment_constraints.sql` (tabela vazia → `SET NOT NULL` seguro):

```sql
ALTER TABLE lesson_attachment
    ALTER COLUMN content_type SET NOT NULL,
    ALTER COLUMN size_bytes   SET NOT NULL,
    ADD CONSTRAINT ck_lesson_attachment_size CHECK (size_bytes > 0);
CREATE INDEX idx_lesson_attachment_lesson ON lesson_attachment(lesson_id);
```

- Entidade `LessonAttachment`: `nullable = false` em `contentType` e `sizeBytes` (`ddl-auto: validate` não valida nulidade).
- `storage_path`: no Drive guarda o **fileId** (~33 chars; coluna aceita 500); no local, `uuid_nome` como hoje.
- Nenhuma permissão nova, nenhuma coluna em `lesson`.

## 4. Lotes do backend

Cada lote fecha com `docker compose up -d && cd backend && ./mvnw -pl harmonia-app -am verify` verde e commit na `main`.

**B1 — lesson-core: regras de edição**
- `LessonLifecyclePolicy.validateContentEdit(SessionStatus current)` (CANCELED → `DomainValidationException`) e `validateReschedule(SessionStatus current, LocalDate newDate, LocalDate today, boolean hasAttendance)`.
- `LessonLifecyclePolicyTest`: DONE/CANCELED recusados no reagendamento; ontem recusado, hoje e amanhã aceitos; com frequência recusado; SCHEDULED atrasada movida p/ o futuro aceita.
- Uma linha em `backend/lesson-core/README.md`.

**B2 — Edição de aula**
- `LessonSchedulingGuard`: sobrecarga `assertSlotIsFree(Enrollment, UUID lessonId, date, start, end, status)` (a atual delega com `UUID.randomUUID()`); `availability(..., UUID excludeLessonId)` filtra a aula de `dayLessons`.
- `TeacherLessonUseCase`:
  - `detail(UUID)`: busca, `assertOwnedByCurrentTeacher`, devolve aula + anexos.
  - `update(UUID id, date, start, end, content, homework)`: (1) `validateContentEdit`; (2) se data/hora mudaram: `requireActive` → `validateReschedule(..., attendances.findByLessonId(id).isPresent())` → `schedulingGuard.assertSlotIsFree(enrollment, id, ..., SCHEDULED)`; (3) grava.
- `TeacherController`: record `UpdateLesson`; `@Size(max = 1000)` em `NewLesson.content/homework`; `GET`/`PUT /lessons/{id}`; `lessonId` opcional em `availability`.
- `presentation/response/LessonDetailResponse` (record), usado também por `StudentController.lessonDetail` (JSON igual).
- Testes:
  - `TeacherLessonUseCaseTest` (mocks): só conteúdo em DONE salva sem chamar o guard; reagendar com frequência → 422 sem guard; outro professor → `OwnershipException`; admin passa.
  - `LessonEditIT`: PUT conteúdo em DONE → 200; reagendar SCHEDULED +30 min sobreposto a si mesma → 200 (prova D3); sobre outra aula → 409; mudar data de DONE → 422; CANCELED → 422; professor B → 403; `content` com 1001 chars → 422 `VALIDATION`; `availability?lessonId=` não lista a própria aula.

**B3 — Regra de arquivo e V16**
- `domain/common/FileSignatures` extraído de `PracticeRecordingRule` (que delega). `PracticeRecordingRuleTest` passa sem mudança.
- `domain/lesson/LessonAttachmentRule`: `MAX_BYTES = 50 MB`, `MAX_PER_LESSON = 10`, extensões `pdf, jpg, jpeg, png, webp, heic, heif` + mídia; content-type `application/pdf`, `image/*`, `audio/*`, `video/*`; magic bytes têm de bater com algum tipo permitido.
- Assinaturas novas: PDF `%PDF` · JPEG `FF D8 FF` · PNG `89 50 4E 47` · WebP `RIFF....WEBP` · HEIC `ftyp` (já coberto).
- `LessonAttachmentRuleTest` (parametrizado): aceita PDF, JPG, PNG, WebP, MP4, MP3; recusa `.pdf` com `MZ`, `.exe`, vazio, 50 MB + 1, 11º anexo.
- `V16` + entidade.

**B4 — Casos de uso e endpoints de anexo**
- `application/storage/StorageTransactions` (estático): `deleteOnRollback(storage, path)` / `deleteAfterCommit(storage, path)`; `PracticeRecordingUseCase` passa a usá-lo (`PracticeRecordingUseCaseTest` verde).
- `LessonAttachmentRepository`: `countByLessonId`, `findByIdAndLessonId`.
- `application/lesson/LessonAttachmentUseCase`:
  - `upload(lessonId, file)`: dono; não CANCELED; `LessonAttachmentRule.validate(..., count)`; `storage.save`; `deleteOnRollback`; `save`.
  - `delete(lessonId, attachmentId)`: dono; não CANCELED; apaga linha; `deleteAfterCommit`.
  - `downloadAsTeacher(lessonId, attachmentId)` / `downloadAsStudent(lessonId, attachmentId)` (o segundo reaproveita `StudentLessonUseCase.detail` p/ dono — RN11).
  - Nome de exibição corta em 255 (como `PracticeRecordingUseCase.displayName`).
  - `// ponytail:` — conexão do banco presa durante o envio ao Drive e contagem de 10 furável por envios concorrentes; corrigir com lock da aula se precisar.
- Controllers: os quatro endpoints da tabela.
- Testes:
  - `LessonAttachmentUseCaseTest` (porta mockada): tipo inválido não toca o storage; outro professor não toca; CANCELED → 422; rollback apaga o novo; remoção só apaga após commit; anexo de outra aula → 404.
  - `LessonAttachmentIT` (`@TempDir` + `app.storage.local-dir`, como `PracticeRecordingIT`): professor envia PDF → 200, arquivo no disco, `storagePath` fora do JSON; aluno da aula vê em `GET /me/lessons/{id}` e baixa bytes idênticos; outro aluno → 403; professor B → 403 (envio e download); admin → 200; exe disfarçado → 422; 11º → 422; DELETE → 204 e arquivo some; DELETE com id de outra aula → 404; > 50 MB → 413 (reaproveitar caso da prática, se houver; senão só o unitário da regra).

**B5 — Troca de provedor e adaptador do Drive**
- `LocalStorageAdapter`: `@ConditionalOnProperty(name = "app.storage.provider", havingValue = "local", matchIfMissing = true)`.
- `infrastructure/storage/StorageUnavailableException` + handler 503 `STORAGE_UNAVAILABLE` (teste no `GlobalExceptionHandler`).
- Dependência: **só** `com.google.auth:google-auth-library-oauth2-http` (credenciais e refresh). HTTP via `RestClient` do Spring (já no classpath).
- `infrastructure/storage/drive/GoogleDriveProperties` (`@ConfigurationProperties("app.storage.google-drive")`): `folderId`, `credentialsFile`, `clientId`, `clientSecret`, `refreshToken`.
- `infrastructure/storage/drive/GoogleDriveConfig` (`@ConditionalOnProperty(havingValue = "google-drive")`) monta `GoogleCredentials`; **falha na subida** sem `folderId` ou sem nenhuma das duas credenciais:
  - Conta de serviço: `ServiceAccountCredentials.fromStream(file).createScoped(DRIVE)`.
  - OAuth: `UserCredentials.newBuilder().setClientId(..).setClientSecret(..).setRefreshToken(..)`.
- `GoogleDriveStorageAdapter implements FileStoragePort`; interceptor do `RestClient` põe `Authorization: Bearer` (`credentials.refreshIfExpired()`); timeouts conexão 10 s, leitura 120 s.
  - `save`: upload resumável — `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id` com `{"name":"<uuid>_<nome-seguro>","parents":["<folderId>"]}`, headers `X-Upload-Content-Type: application/octet-stream` e `X-Upload-Content-Length` → header `Location`; `PUT <Location>` com os bytes → `{"id": ...}`; devolve o `id`.
  - `read`: `GET https://www.googleapis.com/drive/v3/files/{id}?alt=media&supportsAllDrives=true`.
  - `delete`: `DELETE https://www.googleapis.com/drive/v3/files/{id}?supportsAllDrives=true`; 404 ignorado (idempotente como `deleteIfExists`).
  - `RestClientException` ou 4xx/5xx (fora o 404 do delete) → `StorageUnavailableException`, sem copiar o corpo da resposta.
- `application.yml`:

  ```yaml
  app:
    storage:
      provider: ${APP_STORAGE_PROVIDER:local}
      local-dir: ./storage
      google-drive:
        folder-id: ${APP_STORAGE_GOOGLE_DRIVE_FOLDER_ID:}
        credentials-file: ${APP_STORAGE_GOOGLE_DRIVE_CREDENTIALS_FILE:}
        client-id: ${APP_STORAGE_GOOGLE_DRIVE_CLIENT_ID:}
        client-secret: ${APP_STORAGE_GOOGLE_DRIVE_CLIENT_SECRET:}
        refresh-token: ${APP_STORAGE_GOOGLE_DRIVE_REFRESH_TOKEN:}
  ```

- `.gitignore`: `backend/secrets/`. Diferente das chaves RSA, a credencial do Drive **nunca** vai para o git.
- Testes **sem token**:
  - `GoogleDriveStorageAdapterTest`: `MockRestServiceServer` no `RestClient.Builder` + `GoogleCredentials.create(new AccessToken("test", <futuro>))`; confere `parents`, `supportsAllDrives=true` e Bearer nas duas chamadas; devolve o `id`; `read` devolve os bytes; 404 do `delete` silencioso; 403/500 → `StorageUnavailableException`.
  - `GoogleDriveConfigTest` (`ApplicationContextRunner`): `provider=google-drive` sem `folder-id` não sobe; sem provider sobe o bean local.
  - Validação real (permissão, cota) só no smoke do §7.

**B6 (opcional) — "N anexos" na lista de aulas do aluno (Figma 24)**
- `LessonAttachmentRepository.countByLessonIdIn` (`@Query ... GROUP BY`); `TeacherLessonUseCase.attachmentCountByLesson(List<Lesson>)` no molde de `attendanceByLesson`; `LessonResponse.attachmentCount` (`Long`, nulo fora dessa rota), só em `GET /teacher/students/{id}/lessons`. IT com 2 anexos → `attachmentCount: 2`.

## 5. Lotes do mobile

Cada lote fecha com `cd mobile && npx tsc --noEmit && npx jest` verde.

**M1 — Serviço e regras puras**
- `lib/http/apiClient.ts`: `del: <T>(p) => request<T>("DELETE", p)`.
- `teacherService`: `lesson(id)`, `updateLesson(id, body)`, `uploadLessonAttachment(id, file)` (`postForm` + `MEDIA_TIMEOUT_MS`), `deleteLessonAttachment(id, attachmentId)`, `downloadLessonAttachment(id, attachmentId)` (`getBytes`), `availability(..., lessonId?)`; tipos `TeacherLessonDetail`, `LessonAttachment`.
- `studentService`: `contentType` em `LessonAttachment`; `downloadLessonAttachment(lessonId, attachmentId)`.
- `features/teacher/lessonAttachments.ts`: `attachmentError(file, currentCount)` (extensão, ≤ 50 MB, > 0, ≤ 10 no total); `ATTACHMENT_PICKER_TYPES = ["application/pdf", "image/*", "audio/*", "video/*"]`.
- `errorMessage.ts`: `STORAGE_UNAVAILABLE: "Armazenamento indisponível. Tente novamente em instantes."` + regex das mensagens novas.
- Testes: `lessonAttachments.test.ts`, `apiClient.test.ts` (DELETE com 204).

**M2 — Extrair `LessonForm` (refatoração sem mudança de comportamento)**
- Corpo de `app/(teacher)/new-lesson.tsx` → `features/teacher/LessonForm.tsx` (`{ id?: string }`); a rota só renderiza `<LessonForm />`.
- `maxLength` 2000 → **1000** (D6). Testes atuais de nova aula seguem verdes.

**M3 — Anexos na criação**
- `features/teacher/LessonAttachments.tsx`: seção "Anexos" com nome + tamanho (`formatFileSize`) como no Figma 26; "+ Adicionar anexo" (`DocumentPicker.getDocumentAsync({ type: ATTACHMENT_PICKER_TYPES, copyToCacheDirectory: true })`); remover pendente; legenda "PDF, imagem, áudio ou vídeo, até 50 MB · máx. 10"; erro com `accessibilityRole="alert"`.
- `LessonForm`: estado `pending: PickedFile[]` entra no `dirty`; após `newLesson`, envia em sequência. Tudo ok → toast atual. Alguma falha → toast "Aula salva, mas N anexo(s) não foram enviados. Tente de novo na aula." e `router.replace` para `/(teacher)/lesson/[id]`.
- Teste (`src/app/__tests__/newLesson.test.tsx`): 2 arquivos → 1 `newLesson` + 2 uploads na ordem; falha no 2º → toast + `replace`.

**M4 — Edição (`(teacher)/lesson/[id].tsx`)**
- Rota renderiza `<LessonForm key={id} id={id} />`; `_layout.tsx`: `lesson: "schedule"` em `activeTabs`.
- Modo edição:
  - Carrega `teacherService.lesson(id)` com `useResource` + `ScreenState`; preenche o formulário.
  - No lugar do `EnrollmentPicker`, `TeacherStudentIdentity` (nome + instrumento), só leitura.
  - "Agendamento" (data, hora, `SlotPlanner`) só se `status === "SCHEDULED"`, com `availability(..., lessonId)`; em DONE a data aparece como texto.
  - Card "Situação" só com `StatusChip` (frequência continua na agenda).
  - CANCELED: só leitura, sem salvar nem adicionar; download liberado.
  - "Salvar aula": `updateLesson` e depois os pendentes.
  - Anexos do servidor: linha baixa com `saveDownload`; ícone remover → `confirm({ destructive: true })` → `deleteLessonAttachment` → recarrega.
  - `useUnsavedChangesGuard(dirty)` e foco no primeiro inválido.
- Entradas: `AgendaLessonCard` ganha "Editar" (`lessonActions().canEdit = status !== "CANCELED"`, coberto em `agenda.test.ts`); item da lista em `TeacherStudentDetail.tsx:106` vai para `/(teacher)/lesson/[id]`.
- `lessonEdit.test.tsx`: preenche; DONE esconde agendamento; PUT reenvia data/hora atuais; remover pede confirmação e chama `del`; CANCELED sem salvar; 409 aparece no campo de horário.

**M5 — Download pelo aluno**
- `features/files/DownloadButton.tsx` (genérico: `fileName`, `contentType`, `sizeBytes`, `download()`), com a proteção contra toque duplo de `PracticeRecordingDownload`.
- Usado em `(student)/lesson/[id].tsx` (linha vira "Baixar anexo X, tamanho") e no M4. Remove a legenda "Disponível com o professor".
- `studentLessons.test.tsx`: tocar no anexo chama `downloadLessonAttachment` e depois `saveDownload`.

**M6 (opcional, com B6)** — "N anexos" com ícone na lista de aulas em `TeacherStudentDetail`.

## 6. Testes — resumo

| Camada | Novos |
|---|---|
| lesson-core unit | `LessonLifecyclePolicyTest` (reagendar, editar) |
| app unit | `LessonAttachmentRuleTest`, `FileSignatures` (via regras), `TeacherLessonUseCaseTest`, `LessonAttachmentUseCaseTest`, `GoogleDriveStorageAdapterTest`, `GoogleDriveConfigTest`, handler 503 |
| app IT | `LessonEditIT`, `LessonAttachmentIT`, `attachmentCount` (se B6) |
| mobile jest | `lessonAttachments.test.ts`, `apiClient` DELETE, `newLesson.test.tsx` (anexos), `lessonEdit.test.tsx`, `studentLessons.test.tsx` (download), `agenda.test.ts` (`canEdit`) |

Testes existentes (prática, materiais, nova aula, reposição) seguem verdes sem mudar asserção.

## 7. Google Drive — o que o dono decide e fornece

**Autenticação (recomendação em ordem):**

1. **Conta de serviço + Drive compartilhado (Shared Drive)**, se a escola tiver Google Workspace (Workspace for Education é gratuito para escolas). Não depende de uma pessoa (não expira quando alguém troca senha ou sai).
   - **Pegadinha:** conta de serviço **não tem cota própria** — enviar para "Meu Drive" de conta pessoal falha. Tem que ser Shared Drive.
   - Escopo `https://www.googleapis.com/auth/drive` (na prática só enxerga o Shared Drive do qual é membro).
2. **OAuth com refresh token de conta Google dedicada** (ex.: `harmonia.arquivos@gmail.com`), se não houver Workspace.
   - Escopo `https://www.googleapis.com/auth/drive`; `drive.file` só enxerga arquivos/pastas **criados pelo app** → envio para pasta criada à mão falharia.
   - **Pegadinha:** tela de consentimento em "Testing" → refresh token expira em 7 dias. Publicar como "In production" (uma conta só autorizando: aceitar o aviso "app não verificado").

O adaptador aceita as duas — a escolha não trava a implementação.

**Quando a credencial chegar — opção 1:**
1. Google Cloud Console: criar projeto, ativar **Google Drive API**, criar conta de serviço, gerar chave JSON.
2. Drive: criar o Shared Drive (ou pasta nele), adicionar o e-mail da conta de serviço como **Gerente de conteúdo**, copiar o **folder id** da URL (`/folders/<ID>`).
3. Servidor: JSON em `backend/secrets/drive-sa.json` (ignorado pelo git) ou montado em `/app/secrets` no Docker, somente leitura.
4. Variáveis: `APP_STORAGE_PROVIDER=google-drive`, `APP_STORAGE_GOOGLE_DRIVE_FOLDER_ID=<ID>`, `APP_STORAGE_GOOGLE_DRIVE_CREDENTIALS_FILE=/app/secrets/drive-sa.json`.

**Opção 2 (OAuth):**
1. Cliente OAuth tipo "Desktop app"; publicar a tela de consentimento.
2. Gerar o refresh token uma vez com a conta dedicada (ex.: OAuth Playground → "Use your own OAuth credentials", escopo `drive`).
3. `APP_STORAGE_GOOGLE_DRIVE_CLIENT_ID`, `..._CLIENT_SECRET`, `..._REFRESH_TOKEN`, `..._FOLDER_ID` (pasta no Drive da conta dedicada).

**Smoke após configurar:**
- App sem alguma variável → falha na subida com mensagem clara.
- Enviar PDF numa aula → aparece na pasta, **sem compartilhamento público**.
- Baixar pelo app do aluno.
- Remover o anexo → sai do Drive.
- Gravação de prática também vai para o Drive (D14).

**Dá para fazer agora, sem token:** sim — o B5 inteiro, com `MockRestServiceServer` e validação de configuração. Só o smoke depende da credencial; até lá vale o `local`.

## 8. Checklist de verificação

- [ ] `./mvnw -pl harmonia-app -am verify` verde (core, unit, IT, ST).
- [ ] `npx tsc --noEmit && npx jest` verde.
- [ ] Manual (backend local + emulador/web):
  - [ ] Aula futura com 2 anexos.
  - [ ] Editar conteúdo e reagendar sem conflito consigo mesma.
  - [ ] Horário ocupado → 409 explicado.
  - [ ] DONE: só conteúdo, tarefa e anexos editáveis.
  - [ ] CANCELED: só leitura.
  - [ ] Aluno baixa o anexo; outro aluno → 403.
  - [ ] `.exe` renomeado para `.pdf` → 422 traduzido.
  - [ ] 11º anexo recusado.
- [ ] JSON nunca expõe `storagePath`.
- [ ] Sem `APP_STORAGE_PROVIDER` sobe local; `google-drive` com variáveis faltando não sobe.
- [ ] `CLAUDE.md` item 16 (resumo, V16, endpoints, variáveis do Drive) + glossário se surgir termo.

## 9. Fora de escopo

- Migrar arquivos locais existentes para o Drive (D15).
- Validar tipo/magic bytes de **materiais** (`TeacherMaterialUseCase` aceita qualquer arquivo) — recomendado ligar ao `FileSignatures` num lote seguinte.
- Streaming (`InputStream`/`Resource`) no upload/download; hoje o arquivo inteiro vai à memória (teto 50 MB), como na prática.
- Retentativa/backoff contra 429/5xx do Drive; limpeza periódica de órfãos.
- Campo "exercícios" separado; uso de `lesson.notes`.
- Mudar aluno/matrícula de uma aula; desfazer frequência ao reagendar; reabrir aula DONE.
- Anexos no web admin.
- Mover `FileStoragePort` de `infrastructure/storage` para `application/.../port` (inconsistência preexistente, mudança mecânica — outro commit).

## 10. Decisões do dono (2026-10-14)

1. **Conta Google dedicada ao app (opção 2, OAuth + refresh token)** — "isso só para o inicio e validação". O adaptador mantém as duas formas, para trocar por conta de serviço + Shared Drive se a escola adotar Workspace.
2. **Tipos D7** (PDF, imagem, áudio, vídeo) — segue a recomendação.
3. **Aula DONE edita conteúdo, tarefa e anexos**; data travada — segue a recomendação.
