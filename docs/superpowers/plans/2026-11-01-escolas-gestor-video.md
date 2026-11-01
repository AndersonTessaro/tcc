# Plano — Escolas + Gestor, vídeo da galeria, ordem do formulário de aula (2026-11-01)

Origem: orientador (Evandro) em 29/10/2026 — mensagens + áudios em `audios/`.

## Decisões
- `ADMIN` = administrador do sistema (dono do app, vê tudo, cadastra escolas). Usuário com `school_id` nulo.
- Novo papel `MANAGER` = gestor da escola. Cadastra professores e alunos, matrículas, gerencia a agenda de **todos** os professores da escola. Usa o painel web.
- `TEACHER` segue: só a própria agenda e os alunos vinculados (já cadastra aluno pelo app — `POST /teacher/students`).
- Instrumentos continuam **globais** (sem escola).
- Escola padrão "Escola Harmonia" recebe todos os usuários não-admin existentes (backfill).
- Vídeo de prática: escolhido da **galeria** (`expo-image-picker`), limite **150 MB** só para vídeo de prática. Áudio continua pelo document picker (50 MB). Storage segue no Drive.
- Formulário de aula: só muda a ordem, nenhuma regra.

## Fase 1 — Backend: escola + gestor
- `V25__schools.sql`: `school(id uuid pk default gen_random_uuid(), name varchar(120) not null unique, active boolean not null default true, created_at timestamp not null default now())`; `auth_user.school_id uuid null references school(id) on delete cascade`; seed escola padrão; backfill de todo usuário sem papel ADMIN; papel `MANAGER` (descrição "Gestor da escola"); permissão `school.manage` só para ADMIN; MANAGER recebe `student.read/manage/register/update`, `teacher.read/manage`, `enrollment.manage`, `lesson.read/manage`, `attendance.manage`, `report.read`, `finance.manage`, `auth.user.manage`; descrição de ADMIN → "Administrador do sistema".
- `CurrentUserService`: `isSystemAdmin()`, `isManager()`, `currentSchoolId()`; checagens de posse: admin libera tudo; gestor libera se o recurso é da escola dele (via `auth_user.school_id` do professor/aluno); professor/aluno como hoje.
- `GET/POST/PUT /admin/schools` + `POST /admin/schools/{id}/managers` (`school.manage`).
- Toda listagem/ação de `/admin/*` (students, teachers, enrollments, finance, security/users, users delete) filtra/valida pela escola quando o chamador é MANAGER. Cadastros feitos por gestor/professor herdam a escola de quem cadastrou; ADMIN informa `schoolId` ao cadastrar professor/aluno.
- Gestor não atribui papel `ADMIN`/`MANAGER`, não cria papéis/permissões, não mexe em usuário de outra escola, não altera settings globais.
- Agenda do gestor: `GET /admin/lessons?teacherId=&from=&to=`; criar/editar/mudar status de aula de qualquer professor da escola reaproveitando os use cases de aula existentes (caminho de bypass de posse), sem duplicar regra.
- Financeiro: `financial_transaction` ganha `school_id` (backfill escola padrão); gestor só vê/lança da sua escola.
- IT: gestor da escola A → 403/404 em recurso da escola B (cada listagem e ação); professor inalterado; admin vê tudo.

## Fase 2 — Web: escolas + menu por papel + agenda
- Página Escolas (só ADMIN): lista, criar, criar gestor.
- Menu por papel: gestor sem Perfis/Permissões/Escolas/Configurações.
- Página Agenda: filtro professor + semana, criar/editar aula.

## Fase 3 — Mobile: vídeo da galeria
- `npx expo install expo-image-picker`; plugin no `app.json` com texto de permissão em PT.
- `PracticeRecordingPicker`: botões "Vídeo da galeria" (`launchImageLibraryAsync`, só vídeos) e "Arquivo de áudio" (document picker). Mostrar tamanho; erro claro acima de 150 MB.
- Backend: limite de vídeo de prática 150 MB (`spring.servlet.multipart.max-file-size/max-request-size` + regra de arquivo de prática); demais uploads seguem 50 MB. Upload no Drive resumable para arquivo grande.

## Fase 4 — Mobile: ordem do formulário de aula
`LessonFormScreen.tsx`: Aluno → Quando (data, início, duração, fim, disponibilidade) → Situação/frequência (só criação, aula hoje/passada) → Conteúdo + tarefa → Anexos → Salvar. Ajustar `fieldPositions` (scroll até erro) e `newLesson.test.tsx`.

## Verificação
`cd backend && ./mvnw verify` · `cd mobile && npx jest && npx tsc --noEmit` · `cd web && npm test && npm run build`.
