# Relatórios agregados do professor (Frequência, Prática em casa, Desempenho de turmas)

> RF18 · T-028 (`docs/audit/revisao-figma-mobile-2026-10.md`) · Figma `Knfsw9IIzliM6o9KgLbRhG`, seção do professor `61-301`, tela "29 relatórios".
> **[FIGMA]** = conferir no Figma (`get_screenshot`) antes da UI. Conteúdo deduzido do texto dos cards do menu atual; as telas internas não foram vistas.

Diferenças em relação ao que se supunha:
- O status é `EXCUSED`, não `JUSTIFIED`.
- `practice.difficulty` é `VARCHAR` com texto livre, por isso os relatórios não usam a coluna.
- Hoje o dashboard e a Evolução calculam a taxa só com aulas que têm registro. Os relatórios novos seguem a RN09: aula passada sem registro conta como falta.
- Não precisa de migration: `report.read` (V2) já está dada a TEACHER e ADMIN.

## 0. Estado atual (reaproveitado)

| Item | Onde |
|---|---|
| Menu com 4 categorias, 3 "Em breve" | `mobile/src/features/teacher/TeacherReports.tsx` (`REPORT_CATEGORIES`, estado local `individualOpen`) |
| Rota da aba | `mobile/src/app/(teacher)/(tabs)/reports.tsx` |
| "Evolução por aluno" | `GET /teacher/reports?studentId=` → `TeacherController#reports` → `TeacherUseCase#studentDetail` |
| Ownership | `application/teacher/StudentLinkGuard` · `CurrentUserService#currentTeacher()` → 403 `PROFILE_REQUIRED` |
| Domínio puro de referência | `domain/gamification/GamificationService` |
| 422 | `DomainValidationException` → `DOMAIN_VALIDATION` |
| UI | `src/ui/`: `Card`, `ChipGroup`, `ProgressBar`, `ScreenHeader`, `ScreenState`, `ListRow`; `useResource(fn, key)` |
| Gráfico | barras com o `ProgressBar` existente; `react-native-svg` está instalado mas não é usado. Nenhuma dependência nova. |

Tabelas: `lesson(enrollment_id, date, status)`, `attendance(lesson_id UNIQUE, status PRESENT|ABSENT|EXCUSED)`, `practice(student_id, date, duration_min, rating 1–5 nullable, difficulty texto livre)`, `enrollment(student_id, teacher_id, instrument_id, class_group_id nullable, status)`, `class_group(name, teacher_id, instrument_id)`.

## 1. Definições

### Regras comuns
- **Período:** `from`/`to` (ISO) opcionais.
  - Padrão: últimos 30 dias (`to = hoje`, `from = hoje − 29`).
  - `to` no futuro é reduzido para hoje.
  - `from > to` ou intervalo maior que 366 dias → 422 `DOMAIN_VALIDATION`.
  - Presets no app: 30 e 90 dias [FIGMA].
- **Escopo (RN12):** só aulas de matrículas do próprio professor (`enrollment.teacher_id = me`).
- **ADMIN sem perfil de professor:** 403 `PROFILE_REQUIRED`, como nas outras rotas "minhas". O agregado da escola fica no RF30, fora deste plano.
- **Percentual:** `round(100 × parte / total)`. Total 0 → `null`, e o app mostra "—".

### 1.1 Frequência dos alunos
**Aula devida** é uma aula de matrícula minha que cumpre três condições:
- `status <> CANCELED`;
- `date` dentro de `[from, to]`;
- tem registro de frequência **ou** `date < hoje`.

Aula de hoje sem registro e aula futura não contam.

| Métrica | Definição |
|---|---|
| `due` | aulas devidas |
| `present` / `absent` / `excused` | aulas devidas com esse registro |
| `unrecorded` | aulas devidas sem registro; contam como falta (RN09) |
| `rate` | `present / due`; EXCUSED fica no denominador (Q1) |

**Linhas:**
- uma por aluno, mais os totais;
- ordem: `rate` crescente, `null` no fim [FIGMA];
- entram os alunos com matrícula ACTIVE (mesmo com `due = 0`);
- entram também os alunos com matrícula encerrada que tenham aula devida no período;
- cada linha tem `active: boolean`.

**Reposição (RN10):**
- a aula original CANCELED sai do cálculo e a reposição conta;
- se a original era DONE com ABSENT, as duas contam.

**Sem dados:** "Nenhuma aula no período".

### 1.2 Prática em casa
Escopo: alunos com matrícula ACTIVE comigo. A prática é do aluno, não da matrícula.

| Métrica | Definição |
|---|---|
| `minutes` | `sum(duration_min)` no período |
| `sessions` | `count(*)` |
| `practiceDays` | `count(distinct date)` |
| `avgRating` | `sum(rating)/count(rating)` ignorando nulos, 1 casa; `null` se nenhum |
| `lastPractice` | `max(date)` no período |

- **Totais:** `totalMinutes`, `sessions`, `practicingStudents` / `linkedStudents` e `avgRating`.
- **Série semanal:** minutos por semana (segunda), com semanas vazias = 0.
- **Ordem:** `minutes` crescente [FIGMA].
- **Fora:** `difficulty` (texto livre) e XP (já está na Evolução).

### 1.3 Desempenho de turmas
- **Grupo:** `instrumento - turma` quando a matrícula tem turma; só `instrumento` quando não tem. É o mesmo rótulo do dashboard.
- **Matrículas:** só as ACTIVE. Pela RN05, a turma serve só para organizar [FIGMA: turma ou instrumento].

| Métrica | Definição |
|---|---|
| `students` | alunos distintos |
| `due`, `present`, `rate` | regra 1.1, restrita ao grupo |
| `practiceMinutes` | prática dos alunos do grupo no período |
| `avgPracticeMinPerStudent` | `practiceMinutes / students` |
| `avgRating` | `Σrating / Σcount(rating)` |

- **Limitação conhecida:** a prática não tem matrícula. Um aluno em dois grupos tem a prática somada nos dois; documentar sem resolver.
- **Sem dados:** "Nenhuma turma ativa".

## 2. Backend

### 2.1 Endpoints (`TeacherController`, `@PreAuthorize("hasAuthority('report.read')")`)

| Método | Rota | Parâmetros | Resposta |
|---|---|---|---|
| GET | `/teacher/reports/attendance` | `from?`, `to?` | `AttendanceReportResponse` |
| GET | `/teacher/reports/practice` | `from?`, `to?` | `PracticeReportResponse` |
| GET | `/teacher/reports/classes` | `from?`, `to?` | `ClassReportResponse` |

- `GET /teacher/reports?studentId=` continua como está.
- As rotas não têm id no caminho, então não há 404.
- O ownership vem do escopo da consulta (`teacher_id = me`).

### 2.2 Domínio puro — `br.com.harmonia.domain.report`
- **`ReportPeriod(from, to)`**
  - `of(from, to, today)` aplica o padrão de 30 dias e reduz `to` para hoje.
  - Valida o período e lança `DomainValidationException`.
- **`ReportMath`**
  - `Integer percent(part, whole)`;
  - `Double average(sum, count)`;
  - `List<WeekTotal> weekly(Map<LocalDate,Long>, ReportPeriod)`, com `record WeekTotal(LocalDate weekStart, long minutes)`.

### 2.3 Consultas (agregadas no banco, sem N+1)
- `application/lesson/port/EnrollmentAttendanceAggregate(UUID enrollmentId, long due, long present, long absent, long excused, long unrecorded)`
- `application/gamification/port/StudentPracticeAggregate(UUID studentId, long sessions, long minutes, long practiceDays, long ratingSum, long ratingCount, LocalDate lastPractice)`

`LessonRepository`:
```java
@Query("""
  select new br.com.harmonia.application.lesson.port.EnrollmentAttendanceAggregate(
    e.id, count(l),
    sum(case when a.status = :present then 1 else 0 end),
    sum(case when a.status = :absent  then 1 else 0 end),
    sum(case when a.status = :excused then 1 else 0 end),
    sum(case when a.id is null then 1 else 0 end))
  from Lesson l join l.enrollment e left join Attendance a on a.lesson = l
  where e.teacher.id = :teacherId and l.status <> :canceled
    and l.date between :from and :to
    and (a.id is not null or l.date < :today)
  group by e.id""")
```
A consulta agrupa por matrícula; as somas por aluno e por grupo são feitas em memória.

`PracticeRepository`:
- `practiceByStudent(studentIds, from, to)`: agrupa por `p.student.id`.
- `dailyMinutes(studentIds, from, to)`: agrupa por `p.date`.

`EnrollmentRepository#findByTeacherId`:
- recebe `@EntityGraph(attributePaths = {"student.user", "instrument", "classGroup"})`;
- também beneficia `linkedStudents()` e `dashboard()`.

Os índices necessários já existem. Sem migration.

### 2.4 Caso de uso — `application/teacher/TeacherReportUseCase`
- `@Transactional(readOnly = true)`.
- Métodos `attendance(ReportPeriod)`, `practice(ReportPeriod)` e `classes(ReportPeriod)`, cada um com no máximo 3 consultas.
- Métodos privados de soma compartilhados: `byStudent` e `byGroup`.
- O `TeacherUseCase` não muda.

### 2.5 DTOs — `presentation/response/`
```
AttendanceReportResponse(from, to, Totals totals, List<StudentRow> students)
  Totals(due, present, absent, excused, unrecorded, Integer rate)
  StudentRow(studentId, studentName, active, due, present, absent, excused, unrecorded, Integer rate)
PracticeReportResponse(from, to, Totals totals, List<WeekRow> weeks, List<StudentRow> students)
  Totals(totalMinutes, sessions, practicingStudents, linkedStudents, Double avgRating)
  WeekRow(weekStart, minutes)
  StudentRow(studentId, studentName, minutes, sessions, practiceDays, Double avgRating, LocalDate lastPractice)
ClassReportResponse(from, to, List<GroupRow> groups)
  GroupRow(name, instrument, students, due, present, Integer rate, practiceMinutes, avgPracticeMinPerStudent, Double avgRating)
```

## 3. Mobile

### 3.1 Service — `src/features/teacher/teacherService.ts`
- Tipos: `AttendanceReport`, `PracticeReport` e `ClassReport`.
- Funções: `attendanceReport(from, to)`, `practiceReport(from, to)` e `classReport(from, to)`.

### 3.2 Telas — `src/features/teacher/reports/`
Seguem o padrão atual: estado local em `TeacherReports`, sem rota nova no Stack.

| Arquivo | Conteúdo |
|---|---|
| `period.ts` | `ReportRange = "30" \| "90"`, `rangeDates(range, today)`, `RANGE_OPTIONS` |
| `ReportScreen.tsx` | casca comum: `ScreenHeader back`, `ChipGroup` "Período", `ScrollView`/`RefreshControl`, `useResource`, `ScreenState` (skeleton/erro/retry), recebe `render(data)` |
| `AttendanceReport.tsx` | card de totais + `ListRow` por aluno com `ProgressBar` e "75%"/"—"; toque abre `/(teacher)/student/[id]`; "Inativo" quando for o caso |
| `PracticeReport.tsx` | card de totais, barras semanais, barras por aluno; "sem prática no período" |
| `ClassesReport.tsx` | card por grupo: alunos, barra de frequência, prática média por aluno |

`TeacherReports.tsx`:
- `REPORT_CATEGORIES` ganha `kind`;
- o estado vira `open: ReportKind | null`;
- saem "Em breve", `aria-disabled` e `comingSoon`.

Taxa abaixo de 75%: token de alerta do `theme.ts` **e** texto. A cor nunca é o único sinal.

## 4. Testes

**Unitários (Surefire)**
- `ReportPeriodTest`:
  - padrão de 30 dias;
  - `to` futuro é reduzido para hoje;
  - `from > to` lança exceção;
  - 367 dias lança exceção e 366 dias passa.
- `ReportMathTest`:
  - `percent(0,0) == null` e arredondamento;
  - `average` com `count = 0` dá `null`;
  - `weekly` preenche semanas vazias e alinha na segunda.

**IT** — `TeacherReportsIT`:
- `attendance_appliesRn09AndExcludesCanceledAndOtherTeachers`:

  | Aula do professor A | Resultado esperado |
  |---|---|
  | passada, PRESENT | presente |
  | passada, EXCUSED | justificada |
  | passada, sem registro | `unrecorded` (falta pela RN09) |
  | passada, CANCELED | fora (via `JdbcTemplate`) |
  | hoje, sem registro | fora |

  Totais esperados: `due = 3`, `present = 1`, `excused = 1`, `unrecorded = 1`, `rate = 33`. A aula do aluno com o professor B não aparece.
- `practice_aggregatesOnlyActiveLinkedStudents`.
- `classes_groupsByClassOrInstrument`.
- `reports_rejectInvalidPeriod`: 422.
- `reports_forbiddenForStudentAndAdminWithoutTeacherProfile`: 403 `ACCESS_DENIED` / `PROFILE_REQUIRED`.

**Jest**
- `reports/__tests__/period.test.ts`.
- `src/app/__tests__/teacherReports.test.tsx`:
  - abrir cada categoria e trocar o período (o service é chamado com o novo `from`);
  - `rate: null` mostra "—";
  - estado vazio;
  - erro com "Tentar novamente";
  - toque no aluno chama `mockPush`.
- `remainingScreens.test.tsx`: trocar o teste de "coming soon" por "4 categorias habilitadas".

## 5. Tarefas (commits na `main`)

**Backend** (`./mvnw verify` ao fim de cada lote)
1. `feat(backend): período e cálculos puros dos relatórios do professor`
   - `ReportPeriod`, `ReportMath` e os testes.
2. `feat(backend): relatório de frequência dos alunos do professor`
   - aggregate, query e `@EntityGraph`;
   - use case com `attendance`;
   - response, rota e IT.
3. `feat(backend): relatório de prática em casa`
   - aggregate, 2 queries;
   - use case, response, rota e IT.
4. `feat(backend): relatório de desempenho por turma`
   - use case, response, rota e IT.

**Mobile** (`npx jest && npx tsc --noEmit` ao fim de cada lote)

5. `feat(mobile): cliente e período dos relatórios agregados`
6. `feat(mobile): relatório de frequência dos alunos`
   - `ReportScreen`, `AttendanceReport`, `TeacherReports` e os testes.
7. `feat(mobile): relatório de prática em casa`
8. `feat(mobile): relatório de desempenho de turmas`
   - remove o "Em breve" de vez.

**Docs**

9. `docs: relatórios agregados do professor`
   - `CLAUDE.md` passo 17;
   - auditoria T-028 → ACEITO;
   - UML do RF18, se aplicável.

## 6. Perguntas para o dono
1. **EXCUSED entra no denominador da taxa?**
   - Recomendado: sim, mostrado separado, como o dashboard e a Evolução de hoje.
   - Alternativa: tirar do denominador para não penalizar falta justificada.
2. **Conteúdo das 3 telas no Figma.**
   - Recomendado: seguir este plano e conferir com `get_screenshot` antes do lote 6.
3. **Alinhar dashboard e Evolução à RN09?**
   - Hoje os dois ignoram aula sem registro; os números podem ficar diferentes dos relatórios novos.
   - Recomendado: não mexer agora e registrar a diferença no TCC.

## 7. Decisões do dono (2026-10-15)
1. EXCUSED fica no denominador, mostrado separado.
2. Seguir o plano; conferir as telas no Figma antes da UI.
3. Dashboard e Evolução ficam como estão; diferença registrada no TCC.

Fora do escopo:
- filtro por aluno nas rotas agregadas;
- PDF;
- SVG;
- agregado do admin (RF30).
