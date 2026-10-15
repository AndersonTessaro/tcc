# Notificações do professor — central no app

Figma: o dashboard do professor (tela 21, nó `61:346`) tem um sino com ponto vermelho no cabeçalho. Não há tela de
notificações no Figma: a lista segue o estilo do app (`src/ui/*`, padrão das telas do menu Mais).

## Decisões do dono (2026-10-15)
1. **Central no app**, sem push: o backend guarda as notificações; o sino mostra o contador de não lidas e abre a lista.
   Funciona no web, Android e iOS. Push (expo-notifications/EAS) fica fora.
2. **Eventos** que geram notificação para o professor:
   - aluno vinculado registrou prática;
   - aula passada ficou sem presença registrada (evita falta pela RN09);
   - resumo das aulas de hoje (de manhã);
   - aluno vinculado concluiu uma meta.

## Backend (`backend/harmonia-app`)

### Modelo — migration `V19__notification.sql`
```
notification(id uuid pk default gen_random_uuid(), user_id uuid not null references auth_user(id) on delete cascade,
  type varchar(40) not null, title varchar(120) not null, body varchar(500) not null,
  student_id uuid null references student(id) on delete cascade,
  lesson_id uuid null references lesson(id) on delete cascade,
  practice_id uuid null references practice(id) on delete cascade,
  dedupe_key varchar(120) null, read_at timestamp null, created_at timestamp not null default now(),
  unique (user_id, dedupe_key))
index (user_id, created_at desc); partial index on (user_id) where read_at is null
```
Conferir os nomes reais das tabelas (`auth_user`, `student`, `lesson`, `practice`) nas migrations antes de escrever.
Tipos (`NotificationType` enum): `PRACTICE_RECORDED`, `GOAL_COMPLETED`, `ATTENDANCE_MISSING`, `LESSONS_TODAY`.
O destinatário é o **usuário** (não o perfil de professor), para servir depois ao aluno sem migration nova.

### Produção dos eventos
- Seguir o padrão do `AttendanceRecordedEvent` + `GamificationAttendanceListener`: o use case publica um evento de
  domínio via `ApplicationEventPublisher`, e um listener em `application/notification` grava as notificações.
- `PracticeUseCase.register` publica `PracticeRecordedEvent(studentId, practiceId, durationMin, date)`.
  Notifica cada professor com matrícula **ACTIVE** com o aluno (um por professor, mesmo com 2 matrículas).
  Texto: título "Nova prática registrada", corpo "<Aluno> praticou 30 min (dd/mm)". Liga `student_id` e `practice_id`.
- `GoalUseCase.updateProgress` publica `GoalCompletedEvent(studentId, goalId, title)` **só na transição** ACTIVE → COMPLETED.
  Título "Meta concluída", corpo "<Aluno> concluiu a meta \"<título>\"". Liga `student_id`.
- O listener roda na mesma transação (`@EventListener`, como o de gamificação): se gravar a notificação falhar, a prática
  também falha — aceitável e mais simples; registrar essa escolha no plano/CLAUDE.md.

### Jobs diários — `application/notification/NotificationJobs`
- `@EnableScheduling` numa `@Configuration` condicionada a `app.notifications.jobs.enabled` (padrão `true`; `false` no
  perfil de teste para não rodar sozinho nos IT). Fuso: `app.notifications.zone` (padrão `America/Sao_Paulo`); cron
  `app.notifications.cron` (padrão `0 0 7 * * *`).
- Os métodos de trabalho recebem a data (`runFor(LocalDate today)`) para o IT chamar direto; o `@Scheduled` só calcula
  `LocalDate.now(zone)` e delega.
- **Aulas de hoje**: para cada professor com ≥1 aula `SCHEDULED` hoje → título "Aulas de hoje", corpo "Você tem 3 aulas
  hoje. Primeira às 08:00 com <Aluno>." `dedupe_key = "lessons-today:<date>"`.
- **Aula sem presença**: aulas com data entre hoje−7 e ontem, status ≠ CANCELED, sem registro de frequência → uma
  notificação por aula para o professor da matrícula: título "Presença pendente", corpo "Aula de <Aluno> em dd/mm às hh:mm
  está sem presença e conta como falta." Liga `lesson_id` e `student_id`. `dedupe_key = "attendance-missing:<lessonId>"`.
- Dedupe pela unique `(user_id, dedupe_key)`: inserir só se não existir (consulta antes ou `ON CONFLICT DO NOTHING` em
  query nativa) — rodar o job duas vezes no mesmo dia não duplica.
- Limpeza: o mesmo job apaga notificações com mais de 90 dias.

### API — `presentation/notification/NotificationController` (`/notifications`, `isAuthenticated()`)
- `GET /notifications?limit=50` (1–100) → `{ unreadCount, items: [{ id, type, title, body, studentId, lessonId,
  practiceId, read, createdAt }] }`, mais recentes primeiro. Só as do usuário logado.
- `GET /notifications/unread-count` → `{ unreadCount }` (leve, para o sino).
- `PATCH /notifications/{id}/read` → 204; de outro usuário ou inexistente → 404 (não vaza existência).
- `POST /notifications/read-all` → 204.
- Use case em `application/notification`, records de resposta dentro do use case ou `presentation/response`
  mapeando no controller — **DTO de `presentation` não entra em `application`** (Clean Architecture do projeto).

### Testes backend
- Unit: listener (um professor por aluno mesmo com 2 matrículas; ignora matrícula CLOSED; meta só na transição).
- `NotificationsIT`: prática do aluno gera notificação para o professor vinculado e não para outro professor; meta
  concluída gera; `runFor(date)` gera "aulas de hoje" e "presença pendente" e rodar 2× não duplica; aula CANCELED e aula
  com presença não geram; listar/contador/marcar lida/ler todas; marcar a de outro usuário → 404; sem token → 401.
- `./mvnw verify` completo verde.

## Mobile (`mobile/`)
- `features/notifications/notificationService.ts`: `list(limit)`, `unreadCount()`, `markRead(id)`, `markAllRead()`.
- **Sino no dashboard do professor** (`features/teacher/TeacherDashboard.tsx`, à direita de "Olá, Professor!", como no
  Figma): `IconButton` com `notifications-outline`; ponto/contador quando `unreadCount > 0` (mostrar "9+" acima de 9).
  `accessibilityLabel` "Notificações, N não lidas" / "Notificações". Recarrega o contador quando a tela ganha foco
  (`useFocusEffect`) e no pull-to-refresh do dashboard. Falha ao buscar o contador não quebra o dashboard (sino sem badge).
- **Tela** `(teacher)/notifications.tsx` (Stack, como as telas do Mais): lista com ícone por tipo, título, corpo,
  tempo relativo ("há 2 h", "ontem", ou dd/mm), não lidas destacadas (peso/fundo e texto "Não lida" para leitor de tela —
  não só cor). Cabeçalho com ação "Marcar todas como lidas" quando houver não lidas. Tocar: marca como lida (otimista,
  desfaz com toast se falhar) e navega: `PRACTICE_RECORDED` → `/(teacher)/practice/{practiceId}`; `ATTENDANCE_MISSING`
  → `/(teacher)/lesson/{lessonId}`; `GOAL_COMPLETED` → `/(teacher)/student/{studentId}`; `LESSONS_TODAY` → aba Agenda.
  Conferir os parâmetros reais dessas rotas antes de ligar. Vazio: "Nenhuma notificação". Pull-to-refresh.
- Regras de UI: StyleSheet + tokens de `src/ui/theme.ts`, componentes de `src/ui/`, `useResource`, `apiErrorMessage`,
  textos pt-BR, código em inglês, sem comentários óbvios.

### Testes mobile
- `src/app/__tests__/teacherNotifications.test.tsx`: badge com contador e "9+"; dashboard segue funcionando se o contador
  falhar; lista com não lidas; tocar marca lida e navega para a rota certa de cada tipo; marcar todas; estado vazio.
- `npx tsc --noEmit` limpo e `npx jest` verde.

## Docs
- `CLAUDE.md`: item 19 em "Próximos passos" (tabela, eventos, jobs e propriedades, rotas, sino).
- `docs/audit/revisao-figma-mobile-2026-10.md`: linha para o sino da tela 21 e atualizar a frase de pendências
  (notificações ✅).
