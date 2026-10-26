# Ajustes Sonetto (revisão de uso — prazo 30/10/2026)

Fonte: `Ajustes sonetto.pdf` (raiz do repo). Implementação via Codex por fase; revisão, testes e E2E pelo Claude.

## Decisões do dono
- Meta recorrente **encerra ao cumprir**: ao bater o alvo do período vira `ENDED`/concluída e vai para "Encerradas".
- Cabeçalho fixo nas abas do **professor e do aluno**.
- Excluir professor apaga em **cascata** matrículas/aulas/histórico ligados a ele (confirmação com aviso).

## Causas raiz já identificadas
| # | Sintoma | Causa |
|---|---|---|
| 2 | Chip de presença desmarca | `TeacherController` monta `todayLessons` com `LessonResponse::of(lesson)` → `attendance=null`; reload zera `recorded` em `TeacherDashboard`. |
| 3 | Calendário começa segunda | `lib/format/calendar.ts` `(getDay()+6)%7` + arrays Seg..Dom em `MonthCalendar`/`AttendanceCalendar`. |
| 7 | Próxima aula some | A confirmar: `schedule` (horário fixo) não gera `lesson`; e/ou `LocalDate.now()` sem zona. |
| 9 | Admin não loga | Login web passa por `request()` → envia Bearer vencido → Spring 401 em `permitAll` → refresh com cookie `refresh_token` sobrescrito pelo Expo web (cookie não isola porta em `localhost`) → "Login ou senha inválidos". |

## Fase A — Backend
1. Dashboard professor devolve `attendance` das aulas de hoje. IT.
2. Próxima aula do aluno: reproduzir; considerar próxima ocorrência de horário fixo ativo; usar zona `app.notifications.zone`. IT (aula futura, horário fixo, aula de hoje já iniciada).
3. Materiais: `/me/materials` e `/teacher/students/{id}/materials` incluem anexos de aula (`source=LESSON`, `lessonId`, `lessonDate`), só leitura; download pelo endpoint de anexo existente. Sem duplicar arquivo. IT por papel + isolamento entre alunos.
4. Avatar: `V22` `auth_user.avatar_path`; `PUT/GET/DELETE /account/avatar`; `GET /users/{id}/avatar` (professor só aluno vinculado; admin todos). PNG/JPEG ≤ 2 MB por magic bytes; grava via `FileStoragePort`. IT.
5. Excluir usuário: `V23` FKs `ON DELETE CASCADE` (enrollment, lesson, material, practice, goal, schedule, makeup, class_group) e `SET NULL` em `goal.created_by_teacher_id`; `DELETE /admin/users/{id}` (`auth.user.manage`), 409 para si mesmo/ADMIN; apaga arquivos após commit (`StorageTransactions.deleteAfterCommit`). IT.
6. `BearerTokenResolver` ignora `/auth/**`. IT: login com Bearer vencido → 200.
7. Meta cumprida → encerrada (status `ENDED` + marca de cumprida) ao cruzar alvo; listagem separa. Unit + IT.

## Fase B — Mobile
1. `TabHeader` fixo (gradiente) fora do ScrollView nas abas de professor e aluno.
2. Calendário domingo-primeiro (unit `monthGrid`).
3. Chip de presença persiste após reload (jest).
4. Materiais exibem anexos de aula com selo "Aula dd/mm".
5. Perfil do aluno (nome/bio/foto) + foto no professor; avatar em Mais, Perfil, lista e detalhe do aluno. Web: busca com token → data URI.
6. Redundância: dashboard do professor sem links duplicados da tab bar; dashboard do aluno sem link de metas.

## Fase C — Web admin
1. Login/refresh sem Bearer e sem retry de refresh (vitest).
2. "Excluir" em Usuários com confirmação e aviso de cascata (vitest).

## Fase D — Drive
App OAuth publicado "Em produção" (escopo `drive.file` não sensível); refresh token; variáveis em `backend/secrets/`; smoke upload/download.

## Fase E — Pente fino
`./mvnw verify`, `npx jest && npx tsc --noEmit`, `npm test && npm run build`; E2E Playwright (3 perfis + troca admin↔professor); bugs achados corrigidos e registrados em `docs/audit/`.
