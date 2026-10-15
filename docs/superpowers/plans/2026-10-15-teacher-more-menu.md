# Menu "Mais" do professor — Perfil, Turmas, Reposições, Financeiro, Configurações, Ajuda

Figma: só a tela 30 (`docs/audit/figma/30-prof-mais.png`, nó `116:866`) — card de perfil com "Ver perfil" e a lista
Turmas · Horários · Reposições · Financeiro · Configurações · Ajuda · Sair. As telas internas não existem no Figma:
seguem o estilo do app (`src/ui/*`, `theme.ts`, mesmo padrão de `features/teacher/reports/`).

## Decisões do dono (2026-10-15)
1. **Financeiro**: o professor vê só leitura do próprio — mensalidade de cada matrícula ativa dele e o total do mês.
   O financeiro da escola (`/admin/finance`) continua só do admin.
2. **Perfil + Configurações**: perfil mostra nome, e-mail, usuário e instrumentos e edita nome e bio
   (não há telefone no modelo — `teacher.bio` já existe). Configurações: trocar a própria senha (exige a atual) +
   versão do app. E-mail e usuário continuam só o admin alterando.

## Backend (`backend/harmonia-app`)

### B1. Conta própria — `presentation/account/AccountController` (`/account`, qualquer usuário autenticado)
- `GET /account` → `{ username, email, displayName, roles[], teacher: { bio, instruments: [{id,name}] } | null }`.
- `PUT /account` body `{ displayName (NotBlank, max 120), bio (max 500, opcional) }` → mesma resposta. `bio` só se
  aplica quando o usuário tem perfil de professor; ignorada caso contrário.
- `PUT /account/password` body `{ currentPassword, newPassword }` → 204.
  - `newPassword`: mesmas regras do cadastro (`@Size(min = 8)` + `Passwords.fitsBcrypt`, ver `AdminController`).
  - Senha atual errada → 422 `DOMAIN_VALIDATION` (não 401: o cliente HTTP trata 401 como sessão expirada).
  - Nova senha igual à atual → 422.
  - Revoga **todos os refresh tokens** do usuário (o atual sai junto; o app volta para o login depois de trocar).
- Use case em `application/account/AccountUseCase`; DTOs em `presentation/response`; entidade JPA não vaza.

### B2. Mensalidade — migration `V17__enrollment_monthly_fee.sql`
- `ALTER TABLE enrollment ADD COLUMN monthly_fee NUMERIC(10,2) CHECK (monthly_fee IS NULL OR monthly_fee >= 0);`
- `POST /admin/enrollments` aceita `monthlyFee` opcional (`@PositiveOrZero`, `@Digits(integer=8, fraction=2)`).
- `PUT /admin/enrollments/{id}/fee` `{ monthlyFee }` (null limpa) — `hasRole('ADMIN')`.
- `GET /teacher/finance` (`hasAuthority('finance.read.own')`, nova permissão via migration `V18`, dada ao TEACHER e ADMIN; ADMIN sem
  perfil de professor → 403 `PROFILE_REQUIRED`, igual aos relatórios):
  `{ monthlyTotal, withoutFee, items: [{ enrollmentId, studentId, studentName, classLabel, monthlyFee | null }] }` —
  só matrículas ACTIVE do professor logado, ordenadas por nome. `monthlyTotal` soma as não nulas; `withoutFee` conta as nulas.

### B3. Reposições do professor — `GET /teacher/makeups?from=&to=` (`lesson.read`)
- Lista os `makeup_lesson` cujas aulas pertencem a matrículas do professor (RN12), filtrando pela data da **nova** aula;
  padrão: hoje −30 dias até hoje +60 dias; reutilizar `ReportPeriod` para validar o intervalo (máx. 366, `from > to` → 422).
- Item: `{ id, reason, original: { lessonId, date, startTime, status }, makeup: { lessonId, date, startTime, endTime, status }, studentName, instrument }`,
  ordenado pela data da nova aula.
- Criar reposição continua pelo fluxo existente (Agenda → Repor, `POST /teacher/lessons/{id}/makeup`).

### Testes backend
- `AccountIT`: get/put; troca de senha ok (login com a nova funciona, refresh antigo → 401); senha atual errada → 422; sem token → 401.
- `TeacherFinanceIT`: só matrículas ativas do próprio; total e `withoutFee`; aluno → 403; admin sem perfil → 403 `PROFILE_REQUIRED`;
  admin define/limpa a mensalidade; valor negativo → 400.
- `TeacherMakeupsIT`: lista só as do professor; filtro por período; período inválido → 422.
- `./mvnw verify` completo verde.

## Mobile (`mobile/`)

Serviços: `features/account/accountService.ts` (get/update/changePassword), e em `teacherService` `finance()` e `makeups(from,to)`.

Telas (Stack do professor, com `TeacherStackHeader`/tab bar como as demais telas do Stack):
- `(teacher)/(tabs)/more.tsx` — refazer na ordem do Figma: card de perfil com nome + link "Ver perfil" (abre Perfil) e
  chevron; depois Turmas · Horários (já existe: `/(teacher)/schedules`) · Reposições · Financeiro · Configurações · Ajuda · Sair.
  "Histórico de aulas" e "Nova aula" saem do menu só se tiverem outro acesso (Histórico: lista de aulas do aluno/agenda;
  Nova aula: agenda e dashboard) — conferir antes de remover; se não tiverem, mantê-los no fim da lista.
- `(teacher)/profile.tsx` — dados da conta; nome e bio editáveis (`TextField`), Salvar com toast; e-mail/usuário só leitura
  com a nota "Para alterar, fale com a secretaria"; instrumentos como chips só leitura.
- `(teacher)/classes.tsx` — Turmas: agrupa `GET /teacher/enrollments` (já existe) por `classLabel`
  (instrumento ou instrumento - turma, mesmo rótulo do relatório). Cada grupo: nome, nº de alunos, lista de alunos
  (tocar abre `/(teacher)/student/{id}`).
- `(teacher)/makeups.tsx` — Reposições: chips Próximas/Passadas, card por reposição (aluno, instrumento,
  "Original: dd/mm hh:mm → Reposição: dd/mm hh:mm", motivo, status). Vazio: "Nenhuma reposição" + dica "Crie pela Agenda → Repor".
- `(teacher)/finance.tsx` — Financeiro: resumo (total mensal em BRL via `Intl` pt-BR, "N alunos sem mensalidade definida"),
  lista por aluno com valor ou "Não definida". Texto: "Valores definidos pela secretaria". Só leitura.
- `(teacher)/settings.tsx` — Configurações: seção "Segurança" com trocar senha (atual, nova, confirmar; mostrar/ocultar
  como no login; erro por campo; foco no 1º inválido). Sucesso → toast + logout local (refresh foi revogado). Seção
  "Sobre": versão (`expo-constants`).
- `(teacher)/help.tsx` — Ajuda: FAQ estático curto (registrar aula, presença e RN09, reposição, anexos, relatórios) +
  texto fixo "Dúvidas? Fale com a secretaria da escola" (`/admin/settings` é rota de admin).

Regras de UI: só StyleSheet + tokens de `src/ui/theme.ts`; componentes de `src/ui/`; `useResource` para dados; erros com
`apiErrorMessage`; texto em pt-BR, código em inglês; acessibilidade (roles, labels) como nas telas existentes; sem comentários óbvios.

### Testes mobile
- `src/app/__tests__/teacherMore.test.tsx`: menu na ordem do Figma e navegação; perfil salva nome/bio; troca de senha
  (validação local, erro 422 da senha atual mostrado no campo, sucesso faz logout); financeiro (total, "Não definida");
  reposições (vazio + item); turmas agrupadas.
- `npx tsc --noEmit` limpo e `npx jest` verde.

## Docs
- `CLAUDE.md`: item 18 em "Próximos passos" resumindo rotas, permissão e telas.
- `docs/audit/revisao-figma-mobile-2026-10.md`: T-029 → ACEITO (perfil implementado) e linha nova para o menu "Mais" completo.
