# Metas ligadas aos dados reais — plano (2026-10-19)

## Decisões do dono
- **Autoria:** aluno cria as próprias; professor cria para aluno vinculado (`created_by_teacher_id`). Meta do professor aparece marcada; aluno não encerra meta do professor; professor encerra só as que criou (ADMIN bypass, RN13).
- **Período recorrente:** `DAILY` / `WEEKLY` / `MONTHLY`. Progresso zera a cada período; mostra o período atual e a sequência de períodos cumpridos. Meta fica ativa até ser encerrada.
- **Sempre automático:** tipos `PRACTICE_TIME` (minutos praticados no período), `PRACTICE_DAYS` (dias distintos com prática), `ATTENDANCE` (aulas com presença `PRESENT` no período). Sem "Outra" e sem progresso manual.

## Modelo
- Período: semana segunda→domingo; mês calendário; dia. Fuso do servidor (`LocalDate.now()`, como o resto do app).
- Progresso **calculado na leitura** (nunca gravado): soma/contagem dos dados reais dentro da janela do período atual.
- `streak` = períodos completos consecutivos cumpridos, contando para trás a partir do período anterior ao atual (+1 se o atual já está cumprido), nunca antes do período em que a meta foi criada. Limite: 52 períodos para trás.
- Metas antigas (`period` nulo, tipos `STREAK`/`LESSONS`/`OTHER`): ficam só leitura, com `legacy=true`, progresso gravado (`current_progress`) como estava. Não se criam mais.

## Backend
### Migration `V21__goal_period.sql`
- `ALTER TABLE goal ADD COLUMN period VARCHAR(10)` (nulo = legado), `ADD COLUMN ended_at TIMESTAMP`.
- Status ganha `ENDED` (VARCHAR, só o enum Java muda).

### Domínio puro (`domain/gamification`, sem Spring/JPA, com unit test)
- `GoalPeriod { DAILY, WEEKLY, MONTHLY }` com `start(LocalDate day)`, `end(LocalDate day)`, `previousStart(LocalDate start)`.
- `GoalType` ganha `PRACTICE_DAYS`; valores legados continuam no enum para ler linhas antigas.
- `GoalProgressCalculator`: tipo, período, alvo, data de criação, hoje e fatos (`List<PracticeFact(date, minutes)>`, `List<LocalDate> presentLessonDates`) → `GoalProgress(periodStart, periodEnd, current, achieved, streak)`.

### Aplicação
- `GoalUseCase`:
  - `listMine(status)` → metas do aluno atual com progresso calculado. Busca fatos **uma vez por aluno** cobrindo do início mais antigo necessário (limitado a 52 períodos do maior período) até hoje: `PracticeRepository.findByStudentIdAndDateBetween` e nova query em `AttendanceRepository` por aluno + status `PRESENT` + `lesson.date between`.
  - `createForMe(title, description, type, period, target)`.
  - `endMine(goalId)`: dono = aluno atual; recusa (403, exceção de ownership existente) se `createdByTeacher != null`; legado também pode ser encerrado. Seta `ENDED`, `ended_at`.
  - `listForStudent(studentId, status)` / `createForStudent(studentId, …)` / `endForStudent(studentId, goalId)` para o professor: `StudentLinkGuard.assertLinked`; encerrar só se `createdByTeacher` = professor atual (ADMIN bypass).
  - Validação: `target >= 1`; `PRACTICE_DAYS`: `DAILY` máx 1, `WEEKLY` máx 7, `MONTHLY` máx 31 (`DomainValidationException` → 422); tipo legado ou período ausente na criação → 422 (ou 400 pela validação do DTO).
- **Notificação de período cumprido:** `GoalCompletedEvent` dispara quando o período atual cruza o alvo (antes < alvo ≤ depois) por causa de prática nova (em `PracticeUseCase`, após salvar) ou presença (listener de `AttendanceRecordedEvent`, mesma transação, como o de gamificação). PRESENT→ABSENT→PRESENT pode repetir — aceito.
- Remover `updateProgress` e `PUT /me/goals/{id}?progress=`.

### API
- `GET /me/goals?status=ACTIVE|ENDED` (`ENDED` lista `ENDED` + `COMPLETED` legado). `goal.read`.
- `POST /me/goals` `{title, description?, type, period, target}` (`goal.manage`).
- `PATCH /me/goals/{id}/end` (`goal.manage`).
- `GET /teacher/students/{studentId}/goals?status=`, `POST /teacher/students/{studentId}/goals`, `PATCH /teacher/students/{studentId}/goals/{goalId}/end` (`goal.manage`; conferir no seed V2 se TEACHER tem; senão migration concede).
- `GoalResponse`: `id, title, description, type, period, target, currentProgress, status, legacy, createdByTeacher (nome ou null), canEnd, periodStart, periodEnd, achieved, streak`.

### Testes
- Unit: `GoalPeriodTest`, `GoalProgressCalculatorTest` (segunda→domingo, virada de mês, dias distintos, streak quebrado por período sem prática, nada antes da criação), `GoalUseCaseTest` atualizado.
- IT: aluno cria meta semanal de tempo → 2 práticas → `currentProgress` soma; professor cria para vinculado (200) e não vinculado (403); aluno não encerra meta do professor (403); meta de presença sobe após frequência PRESENT; legado com `legacy=true`; notificação ao cruzar o alvo.
- Ajustar `StudentFlowIT`, `TeacherFlowIT`, `NotificationsIT`, `NotificationListenerTest` que usam o PUT antigo.

## Mobile
- `features/goals/` (compartilhado aluno/professor): tipos + chamadas, `GoalCard`, `GoalForm` (modal), `goalText.ts` (rótulos, título sugerido).
- **Formulário:**
  1. Tipo (chips): Tempo de prática · Dias de prática · Presença nas aulas.
  2. Frequência (chips): Diária · Semanal · Mensal.
  3. Alvo:
     - Tempo: `DurationInput` (novo em `src/ui/`) com campos **horas** e **minutos** (0–59) + chips de atalho por período (diária: 15 min, 30 min, 1 h; semanal: 1 h, 2 h, 3 h, 5 h; mensal: 5 h, 10 h, 20 h). Valor final em minutos.
     - Dias/Presença: stepper − / + (limite do período para dias).
  4. Título **opcional**, pré-preenchido com sugestão que acompanha as escolhas até o usuário editar ("3 h de prática por semana", "5 dias de prática por semana", "4 presenças por mês").
  5. Descrição opcional.
- **Cartão:** título, "Definida por <professor>" quando houver, período atual ("Esta semana · 13–19/10"), barra + "1 h 30 min de 3 h", "Cumprida" quando `achieved`, "N semanas seguidas" quando `streak > 0`, "Encerrar meta" (com `confirm`) só se `canEnd`. Legado: "Meta antiga", sem ações.
- Abas do aluno: **Ativas** / **Encerradas**. Remover "Atualizar progresso".
- Professor: `TeacherStudentDetail`, seção "Metas" no Resumo (lista + "Nova meta" abrindo o mesmo `GoalForm`).
- Jest: `DurationInput` (horas+minutos → minutos, atalhos, minutos > 59 recusado), `GoalForm` (título sugerido segue escolhas até ser editado; envia `period`), `GoalsOverview` (abas, encerrar, legado sem ações), detalhe do professor cria meta.

## Fora do escopo
- Push; editar alvo de meta existente (encerra e cria outra); metas de turma.
