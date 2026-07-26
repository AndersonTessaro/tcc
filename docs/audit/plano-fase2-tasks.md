# Plano de Tasks — Fase 2 (Planejamento)

> **Projeto:** Harmonia — Gestão Musical (TCC)
> **Documento de origem:** `C:\Codding\Fag\tcc_anderson\docs\audit\relatorio-auditoria.md`
> **Data:** 2026-07-26 · **Modo:** ECC-only · **Base:** `main` @ `e919a3a`

Este documento é a **Fase 2 (planejamento)** do fluxo ECC-only de 4 fases (Fase 0 descoberta → Fase 1 auditoria → **Fase 2 planejamento** → Fase 3 execução → Fase 4 finalização). Ele converte **cada achado** do relatório de auditoria da Fase 1 em uma task pequena, independente e testável. Nenhum achado foi re-derivado do zero: as referências `arquivo:linha` vêm do relatório, que continua sendo a fonte única de verdade. Nada aqui foi executado ainda — a Fase 3 só começa após aprovação deste plano.

---

## ⚠️ Pré-requisitos bloqueantes (ferramental de teste quebrado nos 3 apps)

Antes de qualquer task de correção, três lacunas de infraestrutura de teste impedem que boa parte das tasks abaixo seja **verificada de fato**. Elas não são opcionais: são dependências de execução.

| # | Bloqueio | Impacto | Tasks afetadas |
|---|---|---|---|
| **P-1** | **Docker daemon parado** → os 11 `*IT.java` do backend (única cobertura de RBAC/ownership/RN11-12-13) não rodam. `./mvnw verify` precisa de `docker compose up -d` em `backend/`. | Toda task cuja verificação seja um teste de integração é **inverificável** sem isso. | BUG-C02, BUG-H01, BUG-H02, BUG-H04, BUG-H05, BUG-H07, BUG-H08, BUG-M01, BUG-M05, BUG-M07, BUG-M11, DEBT-01, DEBT-02 |
| **P-2** | **`@testing-library/react-native` não está instalado no mobile** (`mobile/package.json` só tem `jest` + `jest-expo`). Hoje **não existe** nenhum teste de componente possível no mobile — o único teste é `apiClient.test.ts` (lógica pura). | Nenhuma task de UI mobile (UX-M01..UX-M13, BUG-H10..H15) pode ser verificada automaticamente sem instalar RNTL primeiro. | **EVO-03 é pré-requisito de todo o bloco mobile.** |
| **P-3** | **Sem métrica de cobertura em nenhum dos 3 apps**: sem Jacoco no `backend/pom.xml`, sem `@vitest/coverage-v8` no `web/package.json`, sem `collectCoverageFrom`/thresholds no mobile. O `CLAUDE.md` e as regras ECC exigem 80% mensurável. | Não dá para provar regressão nem progresso de cobertura em nenhuma task. | EVO-01, EVO-02, EVO-03 |

**Recomendação:** resolver **P-1** (só ligar o Docker Desktop, custo zero de código) e **EVO-03** (mobile test infra) *antes* de iniciar as correções, ou aceitar explicitamente que essas tasks entram na Fase 3 com verificação manual e ficam marcadas como "não verificado automaticamente".

**Nota de dependência (pedida na Fase 1):** `DEBT-01` / `DEBT-02` (extrair `assertOwnedByCurrentTeacher` / `assertOwnedByCurrentStudent` em `CurrentUserService`) **não são pré-requisito obrigatório** de `BUG-C02`, mas fazer a extração antes torna o fix do IDOR e mais 3-4 tasks de ownership (BUG-H05, BUG-M09, BUG-M10, EVO-04) substancialmente mais baratas e menos propensas a divergência entre use cases. Fica registrado como **sugestão de ordem, não imposição**.

---

# Bloco A — Correção de bugs

## A.1 — CRITICAL

### BUG-C01 — Token de reset de senha vazado em texto plano nos logs
- **Objetivo:** Remover o token bruto do corpo do e-mail logado e garantir que segredos nunca cheguem a nenhum log, eliminando o vetor de account takeover.
- **Critérios de aceitação:**
  - `PasswordResetUseCase` não concatena mais o token bruto em texto destinado a log; o token só trafega para o canal de entrega (link/parâmetro), nunca para `log.info`.
  - `LogEmailSender` não loga o `body` completo — loga no máximo destinatário mascarado + assunto, em nível `DEBUG`, com o corpo omitido ou redigido.
  - `LogEmailSender` passa a ser `@Profile("dev" | "test")` (ou equivalente), deixando explícito que não é o canal de produção.
  - Nenhuma string contendo o token aparece na saída de log em nenhum nível.
- **Arquivos afetados:** `backend/src/main/java/br/com/harmonia/application/security/PasswordResetUseCase.java:40-41`, `backend/src/main/java/br/com/harmonia/infrastructure/email/LogEmailSender.java:13`, `backend/src/main/java/br/com/harmonia/infrastructure/email/EmailSenderPort.java`
- **Verificação automatizada:** **novo** teste unitário puro (sem Spring, sem Docker) `backend/src/test/java/br/com/harmonia/infrastructure/email/LogEmailSenderTest.java` — captura o `Logger` via appender in-memory (Logback `ListAppender`) e afirma que nenhum evento de log contém o token passado. Complementado por extensão de `backend/src/test/java/br/com/harmonia/auth/PasswordResetIT.java` afirmando que o fluxo continua funcional.

### BUG-C02 — IDOR: professor anexa material a qualquer aluno (viola RN12) 🔒 P-1
- **Objetivo:** Aplicar a checagem de vínculo aluno↔professor em `TeacherMaterialUseCase.attach()`, alinhando-a ao padrão já usado pelos demais use cases de professor.
- **Critérios de aceitação:**
  - `attach()` valida via `EnrollmentRepository` que o `studentId` está vinculado ao professor autenticado; caso contrário lança `OwnershipException` → HTTP 403.
  - `POST /teacher/students/{id}/materials` retorna **403** para aluno não vinculado e **201/200** para aluno vinculado.
  - ADMIN mantém bypass de ownership (RN13), consistente com os outros use cases.
  - A checagem usa o mesmo helper dos demais use cases (ver DEBT-01) ou, se DEBT-01 ainda não foi feito, replica exatamente a semântica de `TeacherLessonUseCase.teacherEnrollment()`.
- **Arquivos afetados:** `backend/src/main/java/br/com/harmonia/application/material/TeacherMaterialUseCase.java:31-48`, `backend/src/main/java/br/com/harmonia/application/context/CurrentUserService.java`, `backend/src/main/java/br/com/harmonia/presentation/teacher/TeacherController.java`
- **Verificação automatizada:** **extensão** de `backend/src/test/java/br/com/harmonia/teacher/TeacherFlowIT.java` com caso `attachMaterial_studentNotLinkedToTeacher_returns403` (espelhando o 403 já existente para outro endpoint) + caso feliz 2xx. **Hedge sem Docker:** **novo** `backend/src/test/java/br/com/harmonia/application/material/TeacherMaterialUseCaseTest.java` (Mockito puro) afirmando `OwnershipException` quando `EnrollmentRepository` não devolve vínculo. **Bloqueio P-1** para a parte IT.

### BUG-C03 — Tokens JWT (access + refresh) em `localStorage` no web admin
- **Objetivo:** Tirar pelo menos o refresh token do alcance de qualquer script na página, reduzindo o impacto de um XSS (agravado pelo advisory aberto do `react-router-dom`, ver BUG-H03).
- **Critérios de aceitação:**
  - Decisão registrada no próprio código/doc entre: (a) cookie `httpOnly; Secure; SameSite=Strict` emitido pelo backend, ou (b) refresh token em memória + access token de vida curta.
  - `authStorage.ts` deixa de gravar o **refresh token** em `localStorage`.
  - Sessão continua funcionando: login → navegação → refresh automático → logout.
  - Se optar por cookie: endpoint de sessão no backend + CORS/`credentials: 'include'` ajustados; se optar por memória: reload da página não deixa a sessão em estado inconsistente (cai para tela de login limpa).
- **Arquivos afetados:** `web/src/lib/http/authStorage.ts:1-17`, `web/src/lib/http/apiClient.ts`, `web/src/features/auth/useAuth.tsx`, (condicional) `backend/src/main/java/br/com/harmonia/presentation/auth/AuthController.java`, `backend/src/main/java/br/com/harmonia/infrastructure/security/SecurityConfig.java`
- **Verificação automatizada:** **novo** `web/src/lib/http/__tests__/authStorage.test.ts` — afirma que após `saveTokens(...)` a chave do refresh token **não** existe em `localStorage` (`expect(localStorage.getItem('refresh')).toBeNull()`), e que o access token continua recuperável pelo caminho escolhido. **Extensão** de `web/src/lib/http/apiClient.test.ts` cobrindo o ciclo 401 → refresh → retry com a nova fonte do token.

---

## A.2 — HIGH

### BUG-H01 — Reset de senha / desativação de conta não revogam refresh tokens 🔒 P-1
- **Objetivo:** Garantir que trocar senha ou desativar uma conta invalide imediatamente todas as sessões existentes daquele usuário.
- **Critérios de aceitação:**
  - `RefreshTokenRepository` ganha `findByUserIdAndRevokedAtIsNull(...)` (ou `revokeAllByUserId`).
  - `PasswordResetUseCase.reset()`, `SecurityAdminUseCase.resetPassword()` e `SecurityAdminUseCase.setStatus(false)` revogam todos os refresh tokens ativos do usuário.
  - Refresh token emitido antes da troca de senha retorna **401** depois dela.
  - Refresh token de usuário desativado retorna **401** imediatamente.
- **Arquivos afetados:** `backend/src/main/java/br/com/harmonia/application/security/PasswordResetUseCase.java`, `backend/src/main/java/br/com/harmonia/application/admin/SecurityAdminUseCase.java`, `backend/src/main/java/br/com/harmonia/application/security/port/RefreshTokenRepository.java`, `backend/src/main/java/br/com/harmonia/application/security/AuthUseCase.java`
- **Verificação automatizada:** **extensão** de `backend/src/test/java/br/com/harmonia/auth/PasswordResetIT.java` (refresh antigo → 401 pós-reset) e de `backend/src/test/java/br/com/harmonia/admin/SecurityAdminIT.java` (refresh → 401 após `setStatus(inactive)`). **Bloqueio P-1.**

### BUG-H02 — Sem rate limiting em `/auth/login`, `/auth/refresh`, `/auth/forgot-password` 🔒 P-1
- **Objetivo:** Implementar rate limiting nas três rotas `permitAll()`, requisito explícito de RF01 no `CLAUDE.md`.
- **Critérios de aceitação:**
  - Filtro/interceptor de rate limit (Bucket4j ou implementação in-memory própria) aplicado às 3 rotas, com limite e janela configuráveis via `application.yml` (sem número mágico no código).
  - Excedente retorna **429** com `Retry-After`, sem vazar se o usuário existe.
  - Chave do bucket por IP (+ username quando disponível), documentada.
  - Comportamento normal (dentro do limite) inalterado.
- **Arquivos afetados:** `backend/src/main/java/br/com/harmonia/infrastructure/security/SecurityConfig.java:58-61`, **novo** `backend/src/main/java/br/com/harmonia/infrastructure/security/LoginRateLimitFilter.java`, `backend/src/main/resources/application.yml`, `backend/pom.xml`
- **Verificação automatizada:** **novo** teste unitário `backend/src/test/java/br/com/harmonia/infrastructure/security/LoginRateLimitFilterTest.java` (sem Docker — N+1 chamadas na janela → 429). **Extensão** de `backend/src/test/java/br/com/harmonia/auth/AuthFlowIT.java` com o caso ponta-a-ponta.

### BUG-H03 — `react-router-dom` vulnerável (open redirect / XSS / DoS / CSRF-RSC)
- **Objetivo:** Atualizar `react-router-dom` para versão sem advisories abertos e travar o resultado.
- **Critérios de aceitação:**
  - `npm audit --audit-level=high` no `web/` sai sem findings **high/critical** em dependência de runtime.
  - `web/package-lock.json` atualizado e commitado.
  - `npm run build`, `npx tsc -b` e `npx vitest run` continuam verdes; todas as rotas admin navegáveis.
- **Arquivos afetados:** `web/package.json:15`, `web/package-lock.json`
- **Verificação automatizada:** step de CI (`npm audit --audit-level=high`) adicionado em EVO-08; regressão funcional coberta pelo suite `vitest` existente + novos testes de componente das tasks UX-W*.

### BUG-H04 — N+1 sistêmico: todo `@ManyToOne`/`@OneToOne` EAGER 🔒 P-1
- **Objetivo:** Tornar as associações LAZY por padrão e usar `@EntityGraph`/`JOIN FETCH` onde a associação é realmente necessária, cortando a explosão de queries em telas de listagem.
- **Critérios de aceitação:**
  - Todas as entidades em `infrastructure/persistence/**` declaram `fetch = FetchType.LAZY` em `@ManyToOne`/`@OneToOne`; `User.roles` e `Role.permissions` deixam de ser EAGER.
  - Os pontos que dependiam do EAGER (autoridades no `AppUserDetailsService`, dashboards) passam a usar `@EntityGraph`/`JOIN FETCH` explícito — sem `LazyInitializationException` em nenhum endpoint.
  - Número de queries de `GET /teacher/dashboard` e `GET /admin/security/users` cai de forma mensurável (meta: contagem constante, independente do nº de linhas).
- **Arquivos afetados:** todas as entidades em `backend/src/main/java/br/com/harmonia/infrastructure/persistence/**`, `backend/src/main/java/br/com/harmonia/application/teacher/TeacherUseCase.java`, `backend/src/main/java/br/com/harmonia/application/admin/SecurityAdminUseCase.java`, `backend/src/main/java/br/com/harmonia/infrastructure/security/AppUserDetailsService.java`, repositórios em `application/**/port/`
- **Verificação automatizada:** **novo** `backend/src/test/java/br/com/harmonia/performance/FetchStrategyIT.java` — habilita `hibernate.generate_statistics`, chama os dois endpoints e afirma teto de `getQueryExecutionCount()` (ex.: `<= 5`), falhando se voltar o N+1. **Bloqueio P-1.**

### BUG-H05 — `orElseThrow()` sem handler → 500 em vez de 404 🔒 P-1
- **Objetivo:** Centralizar o tratamento de "recurso não encontrado" para que a API responda 404 (e 409/400 onde couber) em vez de 500.
- **Critérios de aceitação:**
  - `GlobalExceptionHandler` mapeia `NoSuchElementException` → **404** e `IllegalStateException` → **409** (ou 400, decidido e documentado), devolvendo `ApiError` consistente sem stack trace nem detalhe interno.
  - Os `.orElseThrow()` sensíveis passam a lançar exceção de domínio com mensagem de contexto (ex.: `LessonNotFoundException`) em vez de `NoSuchElementException` genérica, onde a mensagem ajuda o cliente.
  - Nenhum endpoint listado no relatório retorna 500 para ID inexistente.
- **Arquivos afetados:** `backend/src/main/java/br/com/harmonia/presentation/error/GlobalExceptionHandler.java`, `.../presentation/error/ApiError.java`, e os call sites: `StudentLessonUseCase.java:36`, `TeacherLessonUseCase.java:31`, `AttendanceUseCase.java:37`, `MakeupUseCase.java:33`, `ScheduleUseCase.java:35`, `StudentMaterialUseCase.java:33`, `TeacherMaterialUseCase.java:37`, `AdminRegistrationUseCase.java:72-74`, `AuthController`/`AuthUseCase`, `CurrentUserService.java:28`
- **Verificação automatizada:** **novo** `backend/src/test/java/br/com/harmonia/error/NotFoundHandlingIT.java` parametrizado sobre a lista de endpoints, cada um chamado com UUID inexistente afirmando **404** + corpo `ApiError`. **Bloqueio P-1.**

### BUG-H06 — Gamificação: XP não-idempotente e sem limites (viola RN07)
- **Objetivo:** Tornar a concessão de XP idempotente por aula e blindar o registro de prática contra manipulação de data/volume.
- **Critérios de aceitação:**
  - `AttendanceUseCase.register()` só concede +20 XP na **primeira** marcação `PRESENT` daquela aula; re-execuções não somam.
  - Mudança de `PRESENT` para status não-presente **reverte** o XP concedido.
  - `PracticeUseCase.register` rejeita `date` no futuro (**400**) e aplica um teto configurável de submissões/minutos por dia (constante nomeada em config, não literal).
  - Streak e XP resultantes ficam determinísticos para uma mesma sequência de eventos.
- **Arquivos afetados:** `backend/src/main/java/br/com/harmonia/application/lesson/AttendanceUseCase.java:36-58`, `backend/src/main/java/br/com/harmonia/application/gamification/PracticeUseCase.java:32,44-55`, `backend/src/main/java/br/com/harmonia/presentation/student/StudentController.java:45,88-90`, `backend/src/main/java/br/com/harmonia/domain/gamification/GamificationService.java`
- **Verificação automatizada:** **novo** `backend/src/test/java/br/com/harmonia/application/lesson/AttendanceUseCaseTest.java` e `backend/src/test/java/br/com/harmonia/application/gamification/PracticeUseCaseTest.java` (Mockito, **sem Docker**) — casos: dupla marcação PRESENT → XP somado 1x; PRESENT→ABSENT → XP revertido; prática com data futura → exceção; N+1 submissões no dia → exceção. **Extensão** de `GamificationServiceTest` se a regra descer para o domínio puro.

### BUG-H07 — Race condition em `Progress` (updates perdidos) 🔒 P-1
- **Objetivo:** Adicionar controle de concorrência otimista na entidade `Progress` para que dois writes simultâneos não se sobrescrevam silenciosamente.
- **Critérios de aceitação:**
  - `Progress` ganha campo `@Version` + coluna correspondente em **nova** migration Flyway (nunca editando migration existente).
  - Conflito de versão resulta em `OptimisticLockException` tratada: retry curto ou **409** explícito — comportamento documentado.
  - Duas requisições concorrentes de prática somam ambos os XPs (ou uma falha visivelmente), nunca perdem uma silenciosamente.
- **Arquivos afetados:** `backend/src/main/java/br/com/harmonia/infrastructure/persistence/gamification/Progress.java`, **nova** `backend/src/main/resources/db/migration/V10__progress_version.sql`, `PracticeUseCase.java`, `AttendanceUseCase.java`, `GlobalExceptionHandler.java`
- **Verificação automatizada:** **novo** `backend/src/test/java/br/com/harmonia/gamification/ProgressConcurrencyIT.java` — duas threads registrando prática no mesmo `Progress` via `CountDownLatch`; afirma XP final = soma esperada ou exatamente um 409. **Bloqueio P-1.**

### BUG-H08 — Entidades JPA retornadas direto pelos controllers 🔒 P-1
- **Objetivo:** Introduzir DTOs (records) na borda HTTP, cumprindo a regra do próprio `CLAUDE.md` ("DTOs nas bordas; entidade JPA não vaza para o controller") e parando o vazamento de campos de `User`.
- **Critérios de aceitação:**
  - Nenhum método de `StudentController`, `TeacherController`, `SecurityAdminController`, `FinanceController`, `SettingController` tem entidade JPA como tipo de retorno.
  - Payload de aluno/professor não expõe `password`, `emailVerified`, `active` nem o objeto `User` inteiro — apenas projeção mínima necessária à tela.
  - Mapeamento via `record ... from(Entity)` ou MapStruct, consistente em todos os controllers.
  - Contratos consumidos por mobile/web mantidos ou a mudança propagada para os `*Service.ts` correspondentes.
- **Arquivos afetados:** `backend/src/main/java/br/com/harmonia/presentation/student/StudentController.java`, `.../presentation/teacher/TeacherController.java`, `.../presentation/admin/SecurityAdminController.java`, `.../presentation/admin/FinanceController.java`, `.../presentation/admin/SettingController.java`, **novos** DTOs em `presentation/**/dto/`, `mobile/src/features/**/**Service.ts`, `web/src/features/admin/adminService.ts`
- **Verificação automatizada:** **extensão** de `StudentFlowIT`, `TeacherFlowIT`, `SecurityAdminIT` afirmando via JsonPath a **ausência** dos campos sensíveis (`$.student.user.password` inexistente etc.) e a presença dos campos do DTO. **Bloqueio P-1.**

### BUG-H09 — Race condition de refresh concorrente derruba sessão válida (mobile + web)
- **Objetivo:** Deduplicar chamadas concorrentes de refresh nos dois clientes HTTP para que múltiplos 401 simultâneos compartilhem uma única renovação (o backend rotaciona single-use).
- **Critérios de aceitação:**
  - `apiClient` (mobile e web) mantém uma `Promise` de refresh em andamento; requisições concorrentes que recebem 401 aguardam a mesma promise em vez de disparar refresh próprio.
  - Após o refresh, todas as requisições em espera são reexecutadas com o novo access token.
  - Se o refresh falhar de verdade, **todas** falham e a sessão é encerrada uma única vez (um único evento em `authEvents`).
  - Backend só recebe **1** `POST /auth/refresh` por rajada de 401.
- **Arquivos afetados:** `mobile/src/lib/http/apiClient.ts:15-47`, `web/src/lib/http/apiClient.ts`, `mobile/src/lib/http/authEvents.ts`, `web/src/lib/http/authEvents.ts`
- **Verificação automatizada:** **extensão** de `mobile/src/lib/http/__tests__/apiClient.test.ts` e `web/src/lib/http/apiClient.test.ts` com o caso `dispara 3 requisições que retornam 401 simultaneamente → fetch de /auth/refresh chamado exatamente 1 vez → as 3 resolvem com sucesso`.

### BUG-H10 — Mobile: sem restauração de sessão no cold start 🔒 P-2
- **Objetivo:** Restaurar a sessão a partir do SecureStore no mount do `AuthProvider`, eliminando o login forçado a cada abertura do app.
- **Critérios de aceitação:**
  - No mount, `useAuth` lê `tokenStorage` e, havendo token, chama `authService.me()` (hoje existe mas nunca é invocado) para hidratar o usuário.
  - Enquanto resolve, é exibido estado de carregamento — não a tela de login piscando.
  - Token inválido/expirado → tenta refresh; falhando, limpa storage e vai para login.
  - Reabrir o app com refresh token válido entra direto na área autenticada.
- **Arquivos afetados:** `mobile/src/features/auth/useAuth.tsx:14-23`, `mobile/src/features/auth/authService.ts`, `mobile/src/lib/http/tokenStorage.ts`, `mobile/src/app/index.tsx`, `mobile/src/app/_layout.tsx`
- **Verificação automatizada:** **novo** `mobile/src/features/auth/__tests__/useAuth.test.tsx` (RNTL, requer **EVO-03**) — mocka `tokenStorage` com token válido e `authService.me` resolvido, afirma que o provider expõe `loading` e depois `user`; segundo caso com `me()` rejeitado afirma storage limpo e `user === null`. **Sobrepõe UX-M01** (executar como unidade única).

### BUG-H11 — Mobile: erro de login sempre genérico
- **Objetivo:** Excluir `/auth/login` da lógica de retry-refresh e propagar a causa real (rede vs. 401 vs. 5xx) para a tela.
- **Critérios de aceitação:**
  - `apiClient` não tenta refresh em falha de `/auth/login`.
  - Erro carrega status HTTP e/ou tipo (`network` | `unauthorized` | `server`).
  - Tela de login exibe mensagens distintas: credencial inválida, sem conexão, erro do servidor.
- **Arquivos afetados:** `mobile/src/lib/http/apiClient.ts`, `mobile/src/app/(auth)/login.tsx`
- **Verificação automatizada:** **extensão** de `mobile/src/lib/http/__tests__/apiClient.test.ts` — `/auth/login` retornando 401 não dispara `/auth/refresh` e rejeita com erro tipado; `fetch` lançando `TypeError` rejeita como `network`. **Sobrepõe UX-M02.**

### BUG-H12 — Mobile: sem refetch-on-focus (dados obsoletos entre tabs) 🔒 P-2
- **Objetivo:** Trocar `useEffect(..., [])` por `useFocusEffect` nas telas que exibem dados mutáveis, para que voltar a uma tab recarregue os dados.
- **Critérios de aceitação:**
  - Dashboard do aluno, progresso, metas, aulas, lista de alunos e dashboard do professor recarregam ao ganhar foco.
  - Registrar prática e voltar ao dashboard mostra o XP atualizado **sem** reiniciar o app.
  - Sem loop de refetch nem flicker: estado anterior permanece visível enquanto recarrega.
- **Arquivos afetados:** `mobile/src/app/(student)/dashboard.tsx`, `progress.tsx`, `goals.tsx`, `lessons.tsx`, `materials.tsx`, `mobile/src/app/(teacher)/dashboard.tsx`, `students.tsx`, `schedule.tsx`
- **Verificação automatizada:** **novo** `mobile/src/app/(student)/__tests__/dashboard.test.tsx` (RNTL, requer **EVO-03**) mockando `useFocusEffect` do `expo-router` e afirmando que o service é chamado novamente ao simular o foco. **Sobrepõe UX-M04.**

### BUG-H13 — Mobile: sem guard de double-submit em ações que mutam estado 🔒 P-2
- **Objetivo:** Impedir que double-tap duplique registro de prática/presença — impacto direto em RN07 e no diferencial de gamificação do TCC.
- **Critérios de aceitação:**
  - Todo botão que dispara mutação fica `disabled` enquanto a requisição está em voo, com indicação visual de "enviando".
  - Segundo toque durante a requisição não emite segunda chamada.
  - Padrão aplicado uniformemente (hook `useSubmit`/`useAsyncAction` compartilhado, não copiado por tela).
- **Arquivos afetados:** `mobile/src/app/(student)/practice.tsx`, `mobile/src/app/(teacher)/new-lesson.tsx`, `mobile/src/app/(teacher)/schedule.tsx`, `mobile/src/app/(student)/goals.tsx`, **novo** `mobile/src/hooks/use-async-action.ts`
- **Verificação automatizada:** **novo** `mobile/src/hooks/__tests__/use-async-action.test.ts` (unitário puro) + **novo** `mobile/src/app/(student)/__tests__/practice.test.tsx` (RNTL, **EVO-03**) — dois `fireEvent.press` consecutivos ⇒ service chamado 1x. **Sobrepõe UX-M11.**

### BUG-H14 — Mobile: acessibilidade zero em todo o app 🔒 P-2
- **Objetivo:** Adicionar `accessibilityLabel`/`accessibilityRole`/`accessibilityState` em todos os `Pressable`/`TextInput`, atendendo RNF01/RNF02.
- **Critérios de aceitação:**
  - Todo `Pressable` tem `accessibilityRole="button"` + `accessibilityLabel` descritivo (em português, conforme convenção de texto de tela).
  - Todo `TextInput` tem `accessibilityLabel` e `accessibilityHint` quando o formato importa.
  - Estados (selecionado, desabilitado, ocupado) refletidos em `accessibilityState`.
  - `grep` por `Pressable` sem `accessibilityLabel` retorna vazio.
- **Arquivos afetados:** todas as telas em `mobile/src/app/**`, `mobile/src/ui/Card.tsx`, `mobile/src/ui/XpBar.tsx`
- **Verificação automatizada:** **novo** `mobile/src/__tests__/accessibility.test.tsx` (RNTL, **EVO-03**) renderizando as telas principais e afirmando, para cada uma, que `getAllByRole('button')` retorna elementos e que nenhum tem `accessibilityLabel` vazio/indefinido.

### BUG-H15 — Mobile: RF18 (relatórios) implementado no backend mas desconectado 🔒 P-2
- **Objetivo:** Fazer a aba "Relatórios" do professor realmente consumir `teacherService.reports(studentId)` em vez de ser cópia de `students.tsx`.
- **Critérios de aceitação:**
  - `reports.tsx` deixa de ser cópia idêntica de `students.tsx`; ao escolher um aluno, exibe os dados de relatório retornados pela API (desempenho/evolução/prática/frequência).
  - `teacherService.reports` passa a ter call site real.
  - Estados de loading, vazio e erro tratados.
  - RF18 verificável ponta a ponta no mobile.
- **Arquivos afetados:** `mobile/src/app/(teacher)/reports.tsx`, `mobile/src/features/teacher/teacherService.ts`, `mobile/src/app/(teacher)/student/[id].tsx`
- **Verificação automatizada:** **novo** `mobile/src/app/(teacher)/__tests__/reports.test.tsx` (RNTL, **EVO-03**) — mocka `teacherService.reports` e afirma que é chamado com o `studentId` selecionado e que os valores aparecem na tela. **Sobrepõe UX-M08.**

### BUG-H16 — Web: nenhum Error Boundary na árvore de render
- **Objetivo:** Evitar tela branca total: qualquer exceção de render deve cair em uma UI de erro recuperável.
- **Critérios de aceitação:**
  - `<ErrorBoundary>` envolve a árvore em `main.tsx`/`App.tsx` (e, idealmente, um por rota dentro de `AppLayout`).
  - Fallback mostra mensagem em português + botão "Tentar novamente" que remonta a subárvore.
  - Erro é logado no console/telemetria sem expor stack ao usuário final.
- **Arquivos afetados:** `web/src/main.tsx`, `web/src/App.tsx`, `web/src/components/layout/AppLayout.tsx`, **novo** `web/src/components/ErrorBoundary.tsx`
- **Verificação automatizada:** **novo** `web/src/components/__tests__/ErrorBoundary.test.tsx` (RTL) — componente filho que lança; afirma que o fallback é renderizado e que clicar em "Tentar novamente" remonta.

### BUG-H17 — Web: cast sem validação de runtime na resposta da API
- **Objetivo:** Validar o schema das respostas na borda HTTP, para que drift de contrato falhe com erro claro em vez de virar `undefined` dentro de um componente.
- **Critérios de aceitação:**
  - `apiClient` aceita um validador/parser opcional por chamada; `res.json() as Promise<T>` deixa de ser o único caminho.
  - Serviços admin (`adminService`, `authService`) declaram schemas para as respostas que consomem.
  - Resposta fora do schema lança erro identificável (`ContractError`) na borda, com o campo problemático na mensagem.
  - Decisão sobre a lib (zod) registrada; peso do bundle avaliado.
- **Arquivos afetados:** `web/src/lib/http/apiClient.ts:53`, `web/src/features/admin/adminService.ts`, `web/src/features/auth/authService.ts`, `web/package.json`
- **Verificação automatizada:** **extensão** de `web/src/lib/http/apiClient.test.ts` — resposta com campo faltante/tipo errado rejeita com `ContractError`; resposta válida resolve tipada.

### BUG-H18 — Web: erro HTTP descarta corpo da resposta
- **Objetivo:** Preservar a mensagem de validação do backend no erro lançado, eliminando o string-matching frágil (`msg.includes("401")`).
- **Critérios de aceitação:**
  - `apiClient` lança um `ApiError { status, message, details }` construído a partir do corpo (`ApiError` do backend) quando presente.
  - `Login.tsx` passa a checar `err.status === 401` em vez de `msg.includes("401")`.
  - Toasts das páginas admin passam a exibir a mensagem real do backend (base para UX-W03).
- **Arquivos afetados:** `web/src/lib/http/apiClient.ts:51`, `web/src/features/auth/pages/Login.tsx:24`, `web/src/features/admin/pages/*.tsx`
- **Verificação automatizada:** **extensão** de `web/src/lib/http/apiClient.test.ts` — resposta 400 com `{"message":"Valor inválido"}` rejeita com objeto contendo `status: 400` e `message: "Valor inválido"`; **novo** `web/src/features/auth/pages/__tests__/Login.test.tsx` afirmando mensagem específica para 401 vs. 500.

### BUG-H19 — Web: 6 erros de ESLint confirmados
- **Objetivo:** Zerar os erros de lint para que o CI possa exigir `npm run lint` verde.
- **Critérios de aceitação:**
  - `npx eslint . --ext .ts,.tsx` sai com código 0.
  - `react-hooks/set-state-in-effect` resolvido em `useAuth.tsx:26`, `Finance.tsx:25`, `Roles.tsx:25`, `Settings.tsx:26`, `Users.tsx:23` — corrigindo o padrão (estado derivado / init lazy / efeito com guarda), **não** com `eslint-disable`.
  - `react-refresh/only-export-components` resolvido em `useAuth.tsx:51` (separar o hook/context do componente provider em arquivos distintos).
  - Nenhuma supressão de regra adicionada.
- **Arquivos afetados:** `web/src/features/auth/useAuth.tsx`, `web/src/features/admin/pages/Finance.tsx`, `Roles.tsx`, `Settings.tsx`, `Users.tsx`, `web/eslint.config.js`
- **Verificação automatizada:** step `npm run lint` no CI (EVO-08) como gate obrigatório; regressão funcional das páginas coberta pelos testes de componente das tasks UX-W*.

---

## A.3 — MEDIUM

### BUG-M01 — Índices ausentes em FKs 🔒 P-1
- **Objetivo:** Criar índices para as FKs sem índice, evitando full scan em joins e cascatas de delete.
- **Critérios de aceitação:** Nova migration cria índices para `class_group.teacher_id`, `class_group.instrument_id`, `enrollment.instrument_id`, `enrollment.class_group_id`, `material.teacher_id`, `financial_transaction.student_id` e demais FKs listadas pelo `database-reviewer`; nenhum índice duplicado é criado; migration é **nova** (`V11__fk_indexes.sql`), nunca edição de existente.
- **Arquivos afetados:** **nova** `backend/src/main/resources/db/migration/V11__fk_indexes.sql`
- **Verificação automatizada:** **novo** `backend/src/test/java/br/com/harmonia/db/SchemaIndexesIT.java` — consulta `pg_indexes` no container e afirma existência de cada índice esperado. **Bloqueio P-1.**

### BUG-M02 — `TIMESTAMP` sem timezone (15 ocorrências, inclui expiração de token) 🔒 P-1
- **Objetivo:** Migrar colunas temporais para `TIMESTAMPTZ` (ou fixar UTC explicitamente), removendo o risco de app e DB divergirem de fuso — crítico em `auth_refresh_token.expires_at`.
- **Critérios de aceitação:** Nova migration converte as colunas; entidades JPA usam `OffsetDateTime`/`Instant` onde o instante importa; expiração de refresh/reset token é comparada em UTC; app com `TZ` diferente do DB continua expirando tokens no momento correto.
- **Arquivos afetados:** **nova** migration `V12__timestamptz.sql`, entidades em `infrastructure/persistence/**`, `AuthUseCase`, `PasswordResetUseCase`
- **Verificação automatizada:** **novo** `backend/src/test/java/br/com/harmonia/auth/TokenExpiryTimezoneIT.java` — roda com `-Duser.timezone=America/Sao_Paulo` e afirma que token expirado é rejeitado e token válido aceito. **Bloqueio P-1.**

### BUG-M03 — Migrations Flyway editadas in-place após uso (V1, V3, V4, V5)
- **Objetivo:** Neutralizar o risco de checksum mismatch em qualquer banco de dev já migrado e documentar a regra "nunca editar migration aplicada" do `CLAUDE.md`.
- **Critérios de aceitação:** Estratégia escolhida e registrada (repair documentado + baseline, ou recriação do banco dev); `docs/` registra o incidente; `backend/README`/CLAUDE.md ganham a instrução operacional; nenhuma migration existente é editada daqui em diante.
- **Arquivos afetados:** `backend/src/main/resources/db/migration/V1__auth_schema.sql`, `V3__registrations.sql`, `V4__lessons_materials.sql`, `V5__gamification.sql`, `docs/audit/`, `CLAUDE.md`
- **Verificação automatizada:** step de CI (EVO-08) que roda `flyway validate` (ou `./mvnw verify` com Flyway `validateOnMigrate=true`) contra um banco pré-migrado, falhando em mismatch.

### BUG-M04 — Saldo financeiro calculado em Java com `findAll()`
- **Objetivo:** Substituir `findAll().stream().reduce(...)` por agregação SQL, evitando carregar a tabela inteira a cada consulta de saldo (RNF06/RNF09).
- **Critérios de aceitação:** `FinancialTransactionRepository` ganha `@Query` de agregação (`SUM` por `type`); `FinanceUseCase.balance()` usa a agregação; resultado numérico idêntico ao anterior, inclusive com tabela vazia (0, não `null`); tipo monetário `BigDecimal` preservado sem perda de precisão.
- **Arquivos afetados:** `backend/src/main/java/br/com/harmonia/application/finance/FinanceUseCase.java:29-33`, `.../application/finance/port/FinancialTransactionRepository.java`
- **Verificação automatizada:** **extensão** de `backend/src/test/java/br/com/harmonia/admin/FinanceIT.java` — cenário com receitas + despesas afirmando saldo exato, e cenário sem transações afirmando `0`.

### BUG-M05 — Colunas tipo-enum sem `CHECK` constraint 🔒 P-1
- **Objetivo:** Garantir integridade dos enums no nível do banco (RNF05), não só na aplicação.
- **Critérios de aceitação:** Nova migration adiciona `CHECK` para `lesson.status`, `attendance.status`, `enrollment.status`, `goal.status`, `goal.type`, `financial_transaction.type`, `schedule.weekday`; valores atuais compatíveis; `INSERT` com valor inválido é rejeitado pelo banco.
- **Arquivos afetados:** **nova** `backend/src/main/resources/db/migration/V13__enum_checks.sql`
- **Verificação automatizada:** **novo** `backend/src/test/java/br/com/harmonia/db/EnumConstraintsIT.java` — `INSERT` nativo com valor inválido deve lançar `DataIntegrityViolationException`. **Bloqueio P-1.**

### BUG-M06 — Índice redundante em `auth_refresh_token.token_hash`
- **Objetivo:** Remover índice redundante (coluna já é `UNIQUE`), eliminando custo de escrita desnecessário.
- **Critérios de aceitação:** Nova migration dropa o índice redundante; a constraint `UNIQUE` permanece; lookup por `token_hash` continua usando índice (verificável por `EXPLAIN`).
- **Arquivos afetados:** **nova** migration `V14__drop_redundant_index.sql`
- **Verificação automatizada:** cobertura pelo mesmo `SchemaIndexesIT.java` de BUG-M01 (afirmando **ausência** do índice redundante e presença da constraint única).

### BUG-M07 — Sem paginação em endpoints de listagem 🔒 P-1
- **Objetivo:** Adicionar paginação (`Pageable`) nos endpoints de lista, protegendo memória e latência conforme RNF06/RNF09.
- **Critérios de aceitação:** `/admin/security/users`, `/admin/finance/transactions`, `/me/materials`, `/me/goals`, `/teacher/students`, `/teacher/lessons` aceitam `page`/`size` com default e teto de `size`; resposta usa envelope paginado consistente (conteúdo + total + página); mobile e web atualizados para consumir o novo formato sem quebrar as telas.
- **Arquivos afetados:** controllers em `presentation/**`, use cases correspondentes, ports em `application/**/port/`, `mobile/src/features/**/**Service.ts`, `web/src/features/admin/adminService.ts`
- **Verificação automatizada:** **extensão** de `SecurityAdminIT`, `FinanceIT`, `StudentFlowIT`, `TeacherFlowIT` afirmando `size` respeitado e metadados de paginação; **extensão** dos testes de service no web/mobile para o novo shape. **Bloqueio P-1.**

### BUG-M08 — Sem `@Transactional(readOnly = true)` em métodos de leitura
- **Objetivo:** Marcar consultas como somente-leitura, habilitando otimizações do driver/Hibernate e prevenindo escrita acidental.
- **Critérios de aceitação:** Todos os métodos de use case exclusivamente de leitura anotados com `@Transactional(readOnly = true)`; nenhum método de escrita marcado por engano; suíte existente continua verde.
- **Arquivos afetados:** todos os use cases em `backend/src/main/java/br/com/harmonia/application/**`
- **Verificação automatizada:** **novo** teste ArchUnit-style ou reflexivo `backend/src/test/java/br/com/harmonia/architecture/TransactionalConventionTest.java` (unitário, **sem Docker**) — varre métodos `list*`/`find*`/`get*` dos use cases e falha se não estiverem `readOnly = true`.

### BUG-M09 — Validação fraca: `updateGoalProgress` aceita valor negativo/sem teto
- **Objetivo:** Validar o progresso de meta (RF09/RNF05), impedindo valores negativos ou acima do alvo.
- **Critérios de aceitação:** `progress < 0` → **400**; `progress > target` é rejeitado ou clampado ao `target` (decisão documentada); meta já `COMPLETED` não regride silenciosamente; validação declarada no DTO (`@Min`) **e** reforçada no use case.
- **Arquivos afetados:** `backend/src/main/java/br/com/harmonia/application/gamification/GoalUseCase.java:44-54`, `backend/src/main/java/br/com/harmonia/presentation/student/StudentController.java`
- **Verificação automatizada:** **novo** `backend/src/test/java/br/com/harmonia/application/gamification/GoalUseCaseTest.java` (Mockito, **sem Docker**) — casos negativo, acima do target, e transição correta para `COMPLETED`.

### BUG-M10 — Validação fraca: sem checagem `endTime > startTime`
- **Objetivo:** Impedir aula, horário e reposição com intervalo inválido (RNF05).
- **Critérios de aceitação:** Criação/edição em `TeacherLessonUseCase`, `ScheduleUseCase` e `MakeupUseCase` rejeita `endTime <= startTime` com **400** e mensagem clara; regra implementada uma única vez (validador de domínio compartilhado), não copiada 3x.
- **Arquivos afetados:** `backend/src/main/java/br/com/harmonia/application/lesson/TeacherLessonUseCase.java`, `.../application/schedule/ScheduleUseCase.java`, `.../application/lesson/MakeupUseCase.java`, **novo** validador em `domain/`
- **Verificação automatizada:** **novo** teste unitário puro do validador de intervalo em `backend/src/test/java/br/com/harmonia/domain/common/TimeRangeValidatorTest.java` + **extensão** de `ScheduleIT`/`MakeupIT` com um caso 400.

### BUG-M11 — Upload de material sem allow-list de tipo/tamanho 🔒 P-1
- **Objetivo:** Restringir tipo MIME e tamanho no upload de material (RF16/RNF08), sem depender só do limite default do Spring.
- **Critérios de aceitação:** Allow-list de content types e extensão configurável em `application.yml`; tamanho máximo explícito; arquivo fora da allow-list → **415/400** com mensagem clara; nome de arquivo sanitizado (sem path traversal) antes de chegar ao `LocalStorageAdapter`.
- **Arquivos afetados:** `backend/src/main/java/br/com/harmonia/application/material/TeacherMaterialUseCase.java`, `backend/src/main/java/br/com/harmonia/infrastructure/storage/LocalStorageAdapter.java`, `backend/src/main/resources/application.yml`
- **Verificação automatizada:** **novo** `backend/src/test/java/br/com/harmonia/infrastructure/storage/FileNameSanitizerTest.java` (unitário, testa `../../etc/passwd`) + **extensão** de `TeacherFlowIT` com upload de tipo proibido esperando 415. **Bloqueio P-1** para a parte IT.

### BUG-M12 — Web: sem checagem de permissão fina por domínio nas telas admin
- **Objetivo:** Aplicar PBAC no cliente (`finance.manage`, `settings.manage`, `auth.user.manage`), hoje limitado a um guard grosso na rota `/admin` — defesa em profundidade sobre a autorização do backend.
- **Critérios de aceitação:** Cada página/ação admin verifica a authority específica antes de renderizar o controle; usuário sem a permissão não vê a ação (ou a vê desabilitada com motivo); a checagem reusa uma função única (`hasAuthority`) em vez de string literal espalhada; fica explícito no código que isso é UX, não a fronteira de segurança.
- **Arquivos afetados:** `web/src/features/auth/ProtectedRoute.tsx`, `web/src/features/auth/authService.ts`, `web/src/features/admin/pages/Finance.tsx`, `Settings.tsx`, `Users.tsx`, `Roles.tsx`, `Permissions.tsx`, `Registrations.tsx`
- **Verificação automatizada:** **novo** `web/src/features/auth/__tests__/ProtectedRoute.test.tsx` (RTL) — usuário sem `finance.manage` não vê o botão/rota de finanças; com a permissão, vê.

### BUG-M13 — Web: sem `AbortController`/guarda de stale-response
- **Objetivo:** Cancelar requisições de efeitos desmontados, evitando setState em componente desmontado e resposta obsoleta sobrescrevendo dado novo.
- **Critérios de aceitação:** Todo `useEffect` de fetch nas páginas admin passa `signal` e aborta no cleanup; resposta abortada não atualiza estado; padrão encapsulado num hook (`useFetch`/`useAsyncData`), não repetido por página.
- **Arquivos afetados:** `web/src/features/admin/pages/*.tsx`, `web/src/lib/http/apiClient.ts`, **novo** `web/src/lib/http/useAsyncData.ts`
- **Verificação automatizada:** **novo** `web/src/lib/http/__tests__/useAsyncData.test.tsx` (RTL) — desmonta durante a requisição e afirma que `abort` foi chamado e que nenhum warning de setState é emitido.

### BUG-M14 — Web: `.env` commitado, sem `.env.example` e sem exclusão
- **Objetivo:** Tirar `.env` do versionamento e documentar as variáveis esperadas, evitando que um segredo real seja commitado no futuro.
- **Critérios de aceitação:** `web/.env` removido do índice do git e adicionado ao `.gitignore`; `web/.env.example` criado com `VITE_API_BASE_URL` e comentários; README do web referencia o exemplo; `npm run dev` funciona após copiar o exemplo.
- **Arquivos afetados:** `web/.env`, `web/.gitignore`, **novo** `web/.env.example`, `web/README.md`
- **Verificação automatizada:** step de CI (EVO-08) que falha se `web/.env` estiver rastreado (`git ls-files --error-unmatch web/.env` deve falhar).

### BUG-M15 — Logout do admin web não revoga refresh token no backend
- **Objetivo:** Fazer o logout invalidar a sessão no servidor, não apenas limpar o storage local.
- **Critérios de aceitação:** Existe endpoint `POST /auth/logout` que revoga o refresh token apresentado; o web chama esse endpoint antes de limpar o storage; refresh token usado após logout retorna **401**; falha de rede no logout ainda limpa o storage local (fail-safe) e loga o erro.
- **Arquivos afetados:** `backend/src/main/java/br/com/harmonia/presentation/auth/AuthController.java`, `.../application/security/AuthUseCase.java`, `web/src/features/auth/useAuth.tsx`, `web/src/features/auth/authService.ts`, (paridade) `mobile/src/features/auth/authService.ts`
- **Verificação automatizada:** **extensão** de `backend/src/test/java/br/com/harmonia/auth/AuthFlowIT.java` (logout → refresh 401) + **novo** caso em `web/src/features/auth/__tests__/useAuth.test.tsx` afirmando que `logout()` chama o endpoint antes de limpar o storage.

### BUG-M16 — Dependências de dev vulneráveis (web e mobile)
- **Objetivo:** Atualizar `esbuild`, `postcss`, `brace-expansion` (web) e `shell-quote`, `uuid` (mobile) — build-time only, mas ainda assim superfície de supply chain.
- **Critérios de aceitação:** `npm audit` em `web/` e `mobile/` sem findings high/critical (incluindo devDependencies) ou com exceções explicitamente justificadas em `docs/`; lockfiles atualizados; `npm run build` (web) e `npx jest && npx tsc --noEmit` (mobile) verdes.
- **Arquivos afetados:** `web/package.json`, `web/package-lock.json`, `mobile/package.json`, `mobile/package-lock.json`
- **Verificação automatizada:** step `npm audit --audit-level=high` em ambos os apps no CI (EVO-08).

> **Observação:** o item MEDIUM "senha resetada via `window.prompt()`" do relatório está mapeado em **UX-W01** (bloco B) para não gerar task duplicada.

---

## A.4 — LOW

### BUG-L01 — `BaseEntity` declarado e nunca estendido
- **Objetivo:** Resolver a inconsistência: ou fazer as entidades estenderem `BaseEntity` (`id`/auditoria comuns), ou remover a classe morta.
- **Critérios de aceitação:** Decisão registrada; se adotado, entidades UUID passam a estender e a duplicação de `id`/timestamps some; se removido, nenhuma referência resta; schema do banco inalterado (ou migration nova, se houver mudança).
- **Arquivos afetados:** `backend/src/main/java/br/com/harmonia/infrastructure/persistence/common/BaseEntity.java`, entidades em `infrastructure/persistence/**`
- **Verificação automatizada:** suíte IT existente (`./mvnw verify`) deve permanecer verde — nenhuma mudança de comportamento esperada; + `TransactionalConventionTest` estendido com asserção de convenção de herança, se adotada.

### BUG-L02 — IDs inconsistentes: UUID vs `IDENTITY` (Long) em `Role`/`Permission`
- **Objetivo:** Documentar (ou uniformizar) a divergência de estratégia de ID.
- **Critérios de aceitação:** Decisão documentada em `docs/modelo-de-dados.md` com a justificativa (tabelas de catálogo pequenas e estáveis → `IDENTITY` é aceitável); se optar por uniformizar, migration nova + atualização de `SecurityAdminController`/web; contratos de API atualizados nos dois clientes se o tipo mudar.
- **Arquivos afetados:** `backend/src/main/java/br/com/harmonia/infrastructure/persistence/security/Role.java`, `Permission.java`, `docs/modelo-de-dados.md`
- **Verificação automatizada:** `SecurityAdminIT` estendido apenas se o tipo mudar; caso a decisão seja "documentar", verificação é revisão de doc (sem teste automatizado — explicitado).

### BUG-L03 — `Goal.createdByTeacher` e `Goal.deadline` nunca são setados
- **Objetivo:** Ou passar a preencher os campos (ver EVO-06, criação de meta pelo professor), ou removê-los do schema/entidade.
- **Critérios de aceitação:** Decisão registrada; se mantidos, `GoalUseCase.create` recebe e persiste `deadline`, e `createdByTeacher` é preenchido pelo fluxo de professor (EVO-06); se removidos, migration nova drop + entidade limpa.
- **Arquivos afetados:** `backend/src/main/java/br/com/harmonia/infrastructure/persistence/gamification/Goal.java`, `.../application/gamification/GoalUseCase.java:33-41`, `backend/src/main/resources/db/migration/V5__gamification.sql` (via **nova** migration)
- **Verificação automatizada:** **extensão** de `GoalUseCaseTest` (BUG-M09) afirmando persistência de `deadline`; ou, se removidos, `SchemaIndexesIT`-style afirmando ausência da coluna.

### BUG-L04 — `Teacher.instruments` mapeado mas nunca lido/escrito (RN02 sem implementação)
- **Objetivo:** Tornar RN02 ("professor ensina vários instrumentos") real ou remover o mapeamento órfão. Ver **EVO-07** para a versão com UI.
- **Critérios de aceitação:** Decisão registrada; se mantido, existe pelo menos um caminho de leitura/escrita real (endpoint) usando a associação; se removido, entidade e tabela de junção saem via migration nova.
- **Arquivos afetados:** `backend/src/main/java/br/com/harmonia/infrastructure/persistence/profile/Teacher.java`, `backend/src/main/resources/db/migration/V3__registrations.sql` (via **nova** migration)
- **Verificação automatizada:** coberta por **EVO-07** (`TeacherInstrumentsIT`) se a opção for manter; se remover, `SchemaIndexesIT` estendido afirmando ausência da tabela.

### BUG-L05 — `VARCHAR(n)` arbitrário em texto livre
- **Objetivo:** Alinhar os limites de coluna a regra de negócio explícita ou trocar por `TEXT` onde não há regra.
- **Critérios de aceitação:** Cada `VARCHAR(n)` de texto livre tem justificativa documentada ou vira `TEXT`; validação Bean (`@Size`) na borda passa a espelhar exatamente o limite do banco; migration nova.
- **Arquivos afetados:** migrations em `backend/src/main/resources/db/migration/`, entidades correspondentes, DTOs em `presentation/**/dto/`
- **Verificação automatizada:** **novo** teste unitário `backend/src/test/java/br/com/harmonia/presentation/dto/SizeConstraintsTest.java` — reflexivo, afirma que todo campo `String` de DTO de escrita tem `@Size` com `max` correspondente ao schema.

### BUG-L06 — `ON DELETE` inconsistente entre FKs
- **Objetivo:** Documentar a intenção de cada FK (`CASCADE` vs. `RESTRICT`) e uniformizar onde a inconsistência é acidental.
- **Critérios de aceitação:** Tabela de decisão por FK adicionada a `docs/modelo-de-dados.md`; FKs cuja política estava acidental são corrigidas por migration nova; deletar um `Student` produz o efeito documentado (cascata em `practice`/`goal`, restrição em `financial_transaction`, por exemplo).
- **Arquivos afetados:** **nova** migration `V15__fk_ondelete_policy.sql`, `docs/modelo-de-dados.md`
- **Verificação automatizada:** **novo** `backend/src/test/java/br/com/harmonia/db/CascadePolicyIT.java` — deleta entidade pai e afirma o efeito esperado em cada filha. **Bloqueio P-1.**

---

## A.5 — Débito técnico (parte do bloco A)

### DEBT-01 — Extrair `assertOwnedByCurrentTeacher(...)` (guarda duplicada 4x) 🔒 P-1
- **Objetivo:** Centralizar em `CurrentUserService` a guarda de ownership de professor copiada em 4 use cases, eliminando a origem estrutural do IDOR de BUG-C02.
- **Critérios de aceitação:** `CurrentUserService.assertOwnedByCurrentTeacher(studentId)` (ou assinatura equivalente) existe e é usada por `AttendanceUseCase`, `MakeupUseCase`, `ScheduleUseCase`, `TeacherLessonUseCase` **e** `TeacherMaterialUseCase` (BUG-C02); ADMIN mantém bypass (RN13) num único lugar; nenhuma cópia da lógica resta (`grep` por `teacherEnrollment` retorna 1 definição); comportamento 403 inalterado nos ITs existentes.
- **Arquivos afetados:** `backend/src/main/java/br/com/harmonia/application/context/CurrentUserService.java`, `.../application/lesson/AttendanceUseCase.java`, `.../application/lesson/MakeupUseCase.java`, `.../application/schedule/ScheduleUseCase.java`, `.../application/lesson/TeacherLessonUseCase.java`, `.../application/material/TeacherMaterialUseCase.java`
- **Verificação automatizada:** **novo** `backend/src/test/java/br/com/harmonia/application/context/CurrentUserServiceTest.java` (Mockito, **sem Docker**) cobrindo vinculado/não-vinculado/admin; ITs existentes (`TeacherFlowIT`, `ScheduleIT`, `MakeupIT`) devem permanecer verdes como regressão. **Dependência declarada: fazer antes de BUG-C02 reduz o custo de C02, BUG-H05, BUG-M09, BUG-M10 e EVO-04 — sugestão, não obrigação.**

### DEBT-02 — Extrair `assertOwnedByCurrentStudent(...)` (guarda duplicada 3x) 🔒 P-1
- **Objetivo:** Mesma centralização para a guarda de ownership de aluno (RN11), hoje copiada em 3 use cases.
- **Critérios de aceitação:** `CurrentUserService.assertOwnedByCurrentStudent(...)` usada por `StudentMaterialUseCase`, `GoalUseCase`, `StudentLessonUseCase`; nenhuma comparação manual de `getStudent().getId()` resta nos use cases; bypass ADMIN consistente com DEBT-01.
- **Arquivos afetados:** `backend/src/main/java/br/com/harmonia/application/context/CurrentUserService.java`, `.../application/material/StudentMaterialUseCase.java`, `.../application/gamification/GoalUseCase.java:46-47`, `.../application/lesson/StudentLessonUseCase.java`
- **Verificação automatizada:** **extensão** de `CurrentUserServiceTest` (DEBT-01) + `StudentFlowIT` como regressão de 403.

### DEBT-03 — Remover dead code do mobile (scaffold Expo não usado)
- **Objetivo:** Remover componentes e exports sem nenhuma referência, reduzindo ruído e superfície de manutenção (RNF07/RNF10).
- **Critérios de aceitação:** Removidos `app-tabs.tsx`/`.web.tsx`, `animated-icon.tsx`/`.web.tsx`/`.module.css`, `themed-text.tsx`, `themed-view.tsx`, `external-link.tsx`, `hint-row.tsx`, `ui/collapsible.tsx`, `web-badge.tsx`, `BottomTabInset` (`constants/theme.ts:64`) e `isStudent` (`features/auth/authService.ts:31`); `npx tsc --noEmit` e `npx jest` verdes; app inicia e navega normalmente nos dois perfis.
- **Arquivos afetados:** `mobile/src/components/**`, `mobile/src/constants/theme.ts:64`, `mobile/src/features/auth/authService.ts:31`
- **Verificação automatizada:** `npx tsc --noEmit` + `npx jest` (gate no CI de EVO-08); smoke de render das telas principais nos testes RNTL criados nas tasks UX-M*.

### DEBT-04 — Remover `has` não utilizado no `web/authService.ts`
- **Objetivo:** Remover export sem call site — **exceto** se BUG-M12 o adotar como a função única de checagem de authority.
- **Critérios de aceitação:** Ou `has` é removido e `npx tsc -b` fica verde, ou `has` passa a ser o helper usado por BUG-M12 e ganha teste; nunca fica exportado e não usado.
- **Arquivos afetados:** `web/src/features/auth/authService.ts:23`
- **Verificação automatizada:** se adotado, coberto por `web/src/features/auth/__tests__/authService.test.ts` (**novo**, casos com/sem authority); se removido, `npm run build` + `npm run lint` verdes.

### DEBT-05 — Unificar `authEvents` entre mobile e web
- **Objetivo:** Eliminar a duplicação byte-a-byte do pub/sub (zero dependência de plataforma) — melhor candidato a módulo compartilhado.
- **Critérios de aceitação:** Existe uma única implementação consumida pelos dois apps (pacote `shared/` com npm workspaces, ou arquivo único referenciado via path alias); os dois apps compilam (`tsc`) e seus testes passam; a decisão de mecanismo (workspace vs. alias) fica registrada.
- **Arquivos afetados:** `mobile/src/lib/http/authEvents.ts`, `web/src/lib/http/authEvents.ts`, **novo** `shared/authEvents.ts` (+ configs de workspace/alias)
- **Verificação automatizada:** **novo** `shared/__tests__/authEvents.test.ts` rodando nos dois runners (jest e vitest) ou, no mínimo, num deles com o outro importando o mesmo módulo; `apiClient.test.ts` de ambos os apps continua verde.

### DEBT-06 — Registrar decisão sobre duplicação de `apiClient` e `AuthResponse`
- **Objetivo:** Documentar explicitamente a decisão de **não** consolidar agora (o relatório classifica como "não é ganho rápido"), para que não vire achado repetido em auditorias futuras.
- **Critérios de aceitação:** ADR curto em `docs/` explicando por que `apiClient` e o tipo `AuthResponse` permanecem duplicados, qual o gatilho que reabriria a decisão (ex.: quando EVO-10 trouxer paridade web), e o custo aceito.
- **Arquivos afetados:** **novo** `docs/adr/001-duplicacao-http-client.md`, referência em `CLAUDE.md`
- **Verificação automatizada:** sem teste automatizado (task de documentação) — explicitado; verificação é revisão do ADR na Fase 4.

### DEBT-07 — Higiene de dependências do mobile
- **Objetivo:** Remover dependências não usadas, mover `jest` para `devDependencies` e declarar `expo-updates` (usado em `app.json` mas ausente do `package.json` — risco inverso, mais grave que o excesso).
- **Critérios de aceitação:** `@expo/ui`, `expo-device`, `expo-glass-effect`, `expo-status-bar`, `expo-system-ui` removidos após confirmar zero imports; `jest` em `devDependencies`; `expo-updates` declarado com a versão compatível com o SDK 56; `npx expo-doctor` (ou `npx expo install --check`) sem apontar inconsistência; `npx tsc --noEmit` + `npx jest` verdes; app builda.
- **Arquivos afetados:** `mobile/package.json`, `mobile/package-lock.json`, `mobile/app.json`
- **Verificação automatizada:** step de CI (EVO-08) com `npx expo install --check` + `npx tsc --noEmit` + `npx jest`.

### DEBT-08 — Confirmar destino de `@testing-library/react` no web
- **Objetivo:** Decidir entre remover a dependência não usada ou mantê-la porque as tasks UX-W* e BUG-H16/M12/M13 passarão a usá-la.
- **Critérios de aceitação:** Se qualquer task de teste de componente web for aprovada, a dependência **permanece** e passa a ter uso real (pelo menos um teste importando `@testing-library/react`); caso contrário, é removida e `npm run build` fica verde. A decisão é registrada.
- **Arquivos afetados:** `web/package.json`
- **Verificação automatizada:** existência de ao menos um teste em `web/src/**/__tests__/*.test.tsx` importando a lib (checável no CI de EVO-08 via cobertura), ou build verde após remoção.

### DEBT-09 — Limpar scaffolding nunca customizado
- **Objetivo:** Substituir conteúdo genérico de template por documentação real do projeto (relevante para a entrega do TCC).
- **Critérios de aceitação:** `mobile/README.md` e `web/README.md` descrevem o app real (como rodar, variáveis de ambiente, scripts de teste); `mobile/LICENSE` com copyright da Expo/650 Industries resolvido (substituído pela licença correta do TCC ou removido); `mobile/scripts/reset-project.js` removido junto com o script `reset-project` do `package.json`; `backend/HELP.md` confirmado como gitignored.
- **Arquivos afetados:** `mobile/README.md`, `mobile/LICENSE`, `mobile/scripts/reset-project.js`, `mobile/package.json:44`, `web/README.md`, `backend/HELP.md`
- **Verificação automatizada:** sem teste automatizado (documentação) — verificação por checklist na Fase 4; o CI (EVO-08) falha se `npm run reset-project` ainda existir apontando para arquivo removido.

### DEBT-10 — Sanitizar `mobile/AGENTS.md` (tentativa de prompt injection) — **severidade: alta (segurança de processo)**
- **Objetivo:** Remover do repositório a instrução embutida que tenta induzir qualquer agente a buscar uma URL externa "antes de escrever qualquer código", substituindo-a por orientação de projeto legítima e não-imperativa sobre agentes.
- **Critérios de aceitação:** `mobile/AGENTS.md` não contém instrução que force um agente a acessar recurso externo antes de agir; se a referência à documentação versionada do Expo for útil, ela vira nota informativa ("consulte, se necessário") e não comando; `mobile/CLAUDE.md` (que apenas faz `@AGENTS.md`) revisado; o incidente fica registrado em `docs/audit/` como lição aprendida sobre conteúdo de repositório ser dado não-confiável.
- **Arquivos afetados:** `mobile/AGENTS.md`, `mobile/CLAUDE.md`, `docs/audit/relatorio-auditoria.md` (referência cruzada)
- **Verificação automatizada:** step de CI (EVO-08) com grep bloqueando padrões imperativos de fetch externo (`before writing any code`, `http(s)://` combinado com verbo imperativo) em arquivos `*.md` de instrução de agente; falha o build se reaparecer.

---

# Bloco B — Melhorias de interface e UX

> **Todas as tasks mobile deste bloco dependem de EVO-03 (P-2)** para terem verificação automatizada — sem `@testing-library/react-native` instalado, nenhum teste de componente é possível hoje.

## B.1 — Mobile (13 tasks)

### UX-M01 — Persistência de login entre aberturas do app 🔒 P-2
- **Objetivo:** Ao abrir o app com sessão válida no SecureStore, entrar direto na área autenticada, com tela de carregamento até resolver.
- **Critérios de aceitação:** Splash/loading visível durante a restauração; sem flash da tela de login para usuário logado; falha de restauração leva a login com estado limpo.
- **Arquivos afetados:** `mobile/src/features/auth/useAuth.tsx`, `mobile/src/app/index.tsx`, `mobile/src/app/_layout.tsx`
- **Verificação automatizada:** `mobile/src/features/auth/__tests__/useAuth.test.tsx` (**novo**). **Consolidar com BUG-H10 — mesma mudança, executar como unidade única.**

### UX-M02 — Mensagem de erro de login específica 🔒 P-2
- **Objetivo:** Distinguir na UI credencial inválida, falha de rede e erro do servidor.
- **Critérios de aceitação:** Três mensagens distintas em português; sem conexão exibe orientação de rede; erro 5xx não diz "senha inválida"; mensagem some ao editar o campo.
- **Arquivos afetados:** `mobile/src/app/(auth)/login.tsx`, `mobile/src/lib/http/apiClient.ts`
- **Verificação automatizada:** **novo** `mobile/src/app/(auth)/__tests__/login.test.tsx` (RNTL) — três cenários de mock afirmando textos distintos. **Consolidar com BUG-H11.**

### UX-M03 — Pull-to-refresh em listas e dashboards 🔒 P-2
- **Objetivo:** Adicionar `RefreshControl` em todas as listas/dashboards, gesto esperado em app mobile (RNF01/RNF02).
- **Critérios de aceitação:** Dashboard (aluno e professor), aulas, metas, materiais, alunos e agenda suportam pull-to-refresh; indicador aparece durante o refresh e some ao concluir; erro no refresh não apaga os dados já exibidos.
- **Arquivos afetados:** `mobile/src/app/(student)/dashboard.tsx`, `lessons.tsx`, `goals.tsx`, `materials.tsx`, `progress.tsx`, `mobile/src/app/(teacher)/dashboard.tsx`, `students.tsx`, `schedule.tsx`
- **Verificação automatizada:** **novo** `mobile/src/app/(student)/__tests__/lessons.test.tsx` (RNTL) — dispara `refreshControl.props.onRefresh()` e afirma nova chamada ao service + `refreshing` voltando a `false`.

### UX-M04 — Refetch ao focar a tab (dados obsoletos entre tabs) 🔒 P-2
- **Objetivo:** Garantir que voltar a uma tab mostre dados atualizados (prática → XP no dashboard, presença → relatório do aluno).
- **Critérios de aceitação:** Ver BUG-H12; adicionalmente, a transição não apaga a tela (mantém dados antigos enquanto recarrega).
- **Arquivos afetados:** mesmos de BUG-H12
- **Verificação automatizada:** `mobile/src/app/(student)/__tests__/dashboard.test.tsx` (**novo**). **Consolidar com BUG-H12.**

### UX-M05 — "Esqueci a senha": loading e erro reais 🔒 P-2
- **Objetivo:** Parar de exibir a mensagem neutra de sucesso quando a requisição falhou por rede/servidor.
- **Critérios de aceitação:** Botão em estado de carregamento durante a requisição; falha de rede exibe erro de conectividade; sucesso mantém a mensagem neutra ("se o e-mail existir...") — sem revelar existência da conta; botão desabilitado durante o envio.
- **Arquivos afetados:** `mobile/src/app/(auth)/forgot-password.tsx`, `mobile/src/features/auth/authService.ts`
- **Verificação automatizada:** **novo** `mobile/src/app/(auth)/__tests__/forgot-password.test.tsx` (RNTL) — mock rejeitando afirma mensagem de erro (não a de sucesso); mock resolvendo afirma mensagem neutra.

### UX-M06 — Seletor de data/hora em "Nova aula" 🔒 P-2
- **Objetivo:** Substituir campos de texto livre com placeholder de formato por date/time picker nativo.
- **Critérios de aceitação:** Data e hora escolhidas por picker; impossível submeter formato inválido; valor exibido em formato pt-BR; combina com a validação `endTime > startTime` de BUG-M10; dependência de picker adicionada via `npx expo install`.
- **Arquivos afetados:** `mobile/src/app/(teacher)/new-lesson.tsx`, `mobile/src/app/(teacher)/schedule.tsx`, `mobile/package.json`
- **Verificação automatizada:** **novo** `mobile/src/app/(teacher)/__tests__/new-lesson.test.tsx` (RNTL) — afirma que o payload enviado ao service tem data/hora em ISO válido a partir da interação com o picker mockado.

### UX-M07 — Confirmação antes de "Sair" 🔒 P-2
- **Objetivo:** Exigir confirmação antes do logout, evitando perda acidental de sessão.
- **Critérios de aceitação:** Toque em "Sair" abre `Alert` de confirmação com "Cancelar"/"Sair"; cancelar não desloga; confirmar executa o logout (incluindo revogação de BUG-M15).
- **Arquivos afetados:** `mobile/src/app/(student)/more.tsx`, `mobile/src/app/(teacher)/more.tsx`
- **Verificação automatizada:** **novo** `mobile/src/app/(student)/__tests__/more.test.tsx` (RNTL) — mocka `Alert.alert`, afirma que `logout` só é chamado ao acionar o botão de confirmação.

### UX-M08 — Aba "Relatórios" deixar de ser cópia de "Alunos" 🔒 P-2
- **Objetivo:** Entregar de fato a experiência de RF18 no mobile (desempenho/evolução/prática/frequência), hoje uma tela duplicada e confusa.
- **Critérios de aceitação:** Fluxo claro "escolher aluno → ver relatório"; dados de relatório visíveis (não apenas a lista); estado vazio e de erro tratados; navegação distinta da aba "Alunos".
- **Arquivos afetados:** `mobile/src/app/(teacher)/reports.tsx`, `mobile/src/features/teacher/teacherService.ts`
- **Verificação automatizada:** `mobile/src/app/(teacher)/__tests__/reports.test.tsx` (**novo**). **Consolidar com BUG-H15.**

### UX-M09 — Criação de meta pelo aluno (RF09) 🔒 P-2
- **Objetivo:** Expor no mobile a criação de meta — hoje a UI sugere gerenciamento mas não há como criar, apesar de `GoalUseCase.create` existir e estar exposto.
- **Critérios de aceitação:** Botão "Nova meta" na tela de metas abre formulário (título, descrição, tipo, alvo, prazo); validação de campos obrigatórios antes de enviar; meta criada aparece na lista sem reiniciar o app; guard de double-submit (BUG-H13) aplicado.
- **Arquivos afetados:** `mobile/src/app/(student)/goals.tsx`, `mobile/src/features/student/studentService.ts`
- **Verificação automatizada:** **novo** `mobile/src/app/(student)/__tests__/goals.test.tsx` (RNTL) — preenche o formulário, submete, afirma chamada ao service com o payload correto e item novo renderizado.

### UX-M10 — Alvos de toque mínimos de 44x44pt nos filtros 🔒 P-2
- **Objetivo:** Corrigir os alvos pequenos dos filtros "Próximas"/"Passadas" e "Ativas"/"Concluídas".
- **Critérios de aceitação:** Todo controle interativo tem área efetiva ≥ 44x44pt (via `minHeight`/`minWidth`/`hitSlop`); estado selecionado visualmente distinto e refletido em `accessibilityState.selected` (BUG-H14); layout não quebra em telas estreitas.
- **Arquivos afetados:** `mobile/src/app/(student)/lessons.tsx`, `mobile/src/app/(student)/goals.tsx`, `mobile/src/ui/Card.tsx`
- **Verificação automatizada:** **extensão** de `mobile/src/app/(student)/__tests__/lessons.test.tsx` — afirma que os filtros têm `hitSlop` ou estilo com `minHeight >= 44`, e `accessibilityState.selected` correto.

### UX-M11 — Padronizar proteção contra double-submit em todas as telas 🔒 P-2
- **Objetivo:** Uniformizar o comportamento hoje inconsistente entre telas (algumas desabilitam o botão, outras não).
- **Critérios de aceitação:** Todas as telas com mutação usam o mesmo hook/padrão; feedback visual idêntico ("Enviando...") em todas; nenhuma tela de mutação sem o guard.
- **Arquivos afetados:** mesmos de BUG-H13
- **Verificação automatizada:** `mobile/src/hooks/__tests__/use-async-action.test.ts` + testes por tela. **Consolidar com BUG-H13.**

### UX-M12 — Estado de rede offline explícito 🔒 P-2
- **Objetivo:** Diferenciar "sem conexão" de "sem dados", hoje visualmente idênticos.
- **Critérios de aceitação:** Erro de rede exibe componente de offline com ação "Tentar novamente"; lista vazia legítima exibe empty state próprio, com texto diferente; componente reutilizável, não duplicado por tela; dependência de detecção de rede adicionada via `npx expo install` se necessário.
- **Arquivos afetados:** **novo** `mobile/src/components/network-state.tsx`, telas em `mobile/src/app/**`, `mobile/src/lib/http/apiClient.ts`
- **Verificação automatizada:** **novo** `mobile/src/components/__tests__/network-state.test.tsx` (RNTL) + caso em `lessons.test.tsx` afirmando componente de offline em erro de rede e empty state em lista vazia.

### UX-M13 — Botões de presença indicam o status já marcado 🔒 P-2
- **Objetivo:** Refletir na UI o status de frequência já registrado para a aula, hoje invisível para o professor.
- **Critérios de aceitação:** Botão correspondente ao status atual aparece selecionado; alterar o status atualiza a seleção após confirmação do backend; `accessibilityState.selected` correto; combina com a idempotência de XP de BUG-H06 (remarcar o mesmo status não duplica XP).
- **Arquivos afetados:** `mobile/src/app/(teacher)/schedule.tsx`, `mobile/src/app/(teacher)/student/[id].tsx`, `mobile/src/features/teacher/teacherService.ts`
- **Verificação automatizada:** **novo** `mobile/src/app/(teacher)/__tests__/schedule.test.tsx` (RNTL) — dado um mock com `status: PRESENT`, afirma o botão correspondente com `accessibilityState.selected === true`.

## B.2 — Web Admin (9 tasks)

### UX-W01 — Substituir `window.prompt()` de reset de senha por modal
- **Objetivo:** Trocar o prompt nativo por um modal com campo mascarado, confirmação e validação inline.
- **Critérios de aceitação:** Modal com `type="password"`, campo de confirmação e validação de coincidência/força mínima; botão de confirmar desabilitado enquanto inválido ou em voo; cancelar não dispara requisição; sucesso e erro comunicados por toast específico (BUG-H18).
- **Arquivos afetados:** `web/src/features/admin/pages/Users.tsx`, `web/src/components/ui.tsx`, **novo** `web/src/components/PasswordResetDialog.tsx`
- **Verificação automatizada:** **novo** `web/src/components/__tests__/PasswordResetDialog.test.tsx` (RTL) — senhas divergentes mantêm o botão desabilitado e não chamam o service; senhas iguais chamam o service uma única vez.

### UX-W02 — Campo "Valor" (Finance) aceitar vírgula decimal brasileira
- **Objetivo:** Impedir que "12,50" vire `NaN` no formulário financeiro.
- **Critérios de aceitação:** Entrada aceita `12,50` e `12.50`, normalizando para o formato do backend; valores inválidos exibem erro inline e bloqueiam o submit; exibição dos valores em lista formatada em pt-BR (`Intl.NumberFormat`); sem perda de precisão.
- **Arquivos afetados:** `web/src/features/admin/pages/Finance.tsx`, **novo** `web/src/lib/format/currency.ts`
- **Verificação automatizada:** **novo** `web/src/lib/format/__tests__/currency.test.ts` (unitário, casos `"12,50"`, `"12.50"`, `"1.234,56"`, `"abc"`) + caso em `web/src/features/admin/pages/__tests__/Finance.test.tsx` afirmando o payload numérico correto.

### UX-W03 — Toasts de erro específicos por causa
- **Objetivo:** Parar de exibir a mesma mensagem genérica em toda tela admin, usando a mensagem real do backend (habilitada por BUG-H18).
- **Critérios de aceitação:** 400 exibe a mensagem de validação do backend; 401/403 exibem mensagem de permissão/sessão; 5xx e erro de rede têm textos próprios; nenhuma tela usa string genérica única para todos os casos.
- **Arquivos afetados:** `web/src/features/admin/pages/*.tsx`, **novo** `web/src/lib/http/toastError.ts`
- **Verificação automatizada:** **novo** `web/src/lib/http/__tests__/toastError.test.ts` (mapa status → mensagem) + caso em `Users.test.tsx` afirmando o texto do toast para 403 vs. 500. **Depende de BUG-H18.**

### UX-W04 — Checkboxes de role/permissão com estado pendente
- **Objetivo:** Refletir a requisição em andamento ao marcar/desmarcar role ou permissão, evitando clique duplo e estado visualmente mentiroso.
- **Critérios de aceitação:** Checkbox fica `disabled` durante a requisição, com indicador de progresso; falha reverte o estado visual para o valor anterior; sucesso mantém o novo estado; múltiplos toggles rápidos não geram estado inconsistente.
- **Arquivos afetados:** `web/src/features/admin/pages/Roles.tsx`, `web/src/features/admin/pages/Permissions.tsx`, `web/src/components/ui.tsx`
- **Verificação automatizada:** **novo** `web/src/features/admin/pages/__tests__/Roles.test.tsx` (RTL) — com service pendente, afirma `disabled`; com service rejeitando, afirma reversão do `checked`.

### UX-W05 — Formulário de matrícula com selects buscáveis em vez de UUIDs digitados
- **Objetivo:** Eliminar a digitação manual de UUIDs (aluno, professor, instrumento, turma) e o erro vago "verifique os IDs".
- **Critérios de aceitação:** Cada campo vira select com busca por nome, carregado da API; submit envia os UUIDs selecionados; erro do backend aponta qual campo falhou; formulário não permite submit com seleção incompleta.
- **Arquivos afetados:** `web/src/features/admin/pages/Registrations.tsx`, `web/src/features/admin/adminService.ts`, **novo** `web/src/components/SearchSelect.tsx`
- **Verificação automatizada:** **novo** `web/src/components/__tests__/SearchSelect.test.tsx` (RTL — filtra por texto, seleciona, emite o UUID) + `Registrations.test.tsx` afirmando payload correto.

### UX-W06 — Acessibilidade em tabelas e botões de ação
- **Objetivo:** Corrigir o gap de acessibilidade das tabelas admin (RNF01).
- **Critérios de aceitação:** Todo `<th>` tem `scope="col"`; toda tabela tem `<caption>` ou `aria-label`; botões de ação por linha têm `aria-label` identificando a linha (ex.: "Desativar usuário maria@escola.com"); navegação por teclado alcança todos os controles em ordem lógica.
- **Arquivos afetados:** `web/src/features/admin/pages/Users.tsx`, `Roles.tsx`, `Permissions.tsx`, `Finance.tsx`, `Registrations.tsx`, `web/src/components/ui.tsx`
- **Verificação automatizada:** **novo** `web/src/features/admin/pages/__tests__/accessibility.test.tsx` (RTL) — para cada página, `getByRole('table')`, cabeçalhos com `scope`, e `getByRole('button', { name: /Desativar usuário .+/ })` resolvendo.

### UX-W07 — Skeleton na área de dados em vez de substituir a página inteira
- **Objetivo:** Trocar `<p>Carregando...</p>` que apaga a página por skeleton que preserva o chrome (nav, título, filtros).
- **Critérios de aceitação:** Durante o carregamento, layout e navegação permanecem visíveis; skeleton com a forma aproximada da tabela; sem layout shift ao chegar os dados; padrão único reutilizado em todas as páginas admin.
- **Arquivos afetados:** `web/src/features/admin/pages/*.tsx`, `web/src/components/layout/AppLayout.tsx`, **novo** `web/src/components/TableSkeleton.tsx`
- **Verificação automatizada:** **extensão** de `Users.test.tsx` — com service pendente, afirma que o título/nav continuam no documento **e** que o skeleton está presente (`getByTestId('table-skeleton')`).

### UX-W08 — "Esqueci senha" no web não mascarar falha de rede
- **Objetivo:** Mesmo problema de UX-M05, no cliente web: sucesso exibido mesmo quando a requisição falhou.
- **Critérios de aceitação:** Falha de rede/5xx exibe erro real; sucesso mantém a mensagem neutra sem revelar existência do e-mail; botão com estado de carregamento e desabilitado durante o envio.
- **Arquivos afetados:** `web/src/features/auth/pages/Forgot.tsx`, `web/src/features/auth/authService.ts`
- **Verificação automatizada:** **novo** `web/src/features/auth/pages/__tests__/Forgot.test.tsx` (RTL) — mock rejeitando afirma mensagem de erro; mock resolvendo afirma mensagem neutra.

### UX-W09 — Confirmação antes de ações destrutivas
- **Objetivo:** Exigir confirmação para desativar usuário e resetar senha, hoje executadas em clique único.
- **Critérios de aceitação:** Diálogo de confirmação nomeando explicitamente o alvo ("Desativar maria@escola.com?"); cancelar não dispara requisição; confirmar executa e mostra o resultado; componente de confirmação reutilizável para futuras ações destrutivas.
- **Arquivos afetados:** `web/src/features/admin/pages/Users.tsx`, **novo** `web/src/components/ConfirmDialog.tsx`
- **Verificação automatizada:** **novo** `web/src/components/__tests__/ConfirmDialog.test.tsx` (RTL) + caso em `Users.test.tsx` afirmando que cancelar não chama o service e confirmar chama uma única vez.

---

# Bloco C — Evolução além do escopo do MVP original

> Toda task deste bloco cita a exigência do `CLAUDE.md` ou o caminho de código **observado na auditoria** que a justifica. Nenhuma feature fora de RF01-30 / RN01-13 / RNF01-10 foi inventada.

### EVO-01 — Jacoco no backend com relatório e threshold
- **Justificativa:** `CLAUDE.md` exige "Testes: domínio e use cases com unit test; integração nas bordas" e as regras ECC exigem 80% mensurável. A auditoria constatou que **não há plugin Jacoco no `backend/pom.xml`** → a cobertura não é mensurável nem quando os testes rodam.
- **Objetivo:** Adicionar Jacoco ao build Maven, com relatório agregado de `test` + `integration-test` e threshold de falha.
- **Critérios de aceitação:** `./mvnw verify` gera `target/site/jacoco/index.html`; cobertura de `application/**` e `domain/**` é reportada; `jacoco:check` falha abaixo de um mínimo acordado (proposta: iniciar em número real medido, subir gradualmente até 80%); relatório de unit e IT agregados (não só o de unit).
- **Arquivos afetados:** `backend/pom.xml`
- **Verificação automatizada:** o próprio `./mvnw verify` é o teste — falha se o relatório não for gerado ou se o threshold não for atingido. **Bloqueio P-1** (o número real só sai com Docker no ar).

### EVO-02 — Cobertura mensurável no web (`@vitest/coverage-v8`)
- **Justificativa:** A auditoria constatou que `@vitest/coverage-v8` **não está instalado** → % não mensurável, com 0% conhecido nas páginas admin (Users, Roles, Permissions, Finance, Settings, Registrations).
- **Objetivo:** Instalar e configurar cobertura no Vitest, com script dedicado e thresholds.
- **Critérios de aceitação:** `npm run test:coverage` produz relatório de linha/branch por arquivo; `coverage/` no `.gitignore`; thresholds configurados em `vite.config.ts`; comando integrado ao CI (EVO-08).
- **Arquivos afetados:** `web/package.json`, `web/vite.config.ts`, `web/.gitignore`
- **Verificação automatizada:** o próprio comando de cobertura no CI, falhando abaixo do threshold.

### EVO-03 — Infra de teste de componente + cobertura no mobile — **pré-requisito P-2 de todo o bloco B mobile**
- **Justificativa:** A auditoria mediu **1 arquivo de teste para 46 arquivos-fonte** no mobile e 0% em todas as telas, services e `useAuth`. A causa estrutural observada é que `@testing-library/react-native` **não está declarado** em `mobile/package.json` — nenhum teste de tela é possível hoje.
- **Objetivo:** Instalar RNTL, configurar o preset Jest para renderizar componentes Expo Router e habilitar métrica de cobertura.
- **Critérios de aceitação:** `@testing-library/react-native` em `devDependencies`; um teste-piloto renderiza uma tela real com sucesso; `collectCoverageFrom` cobre `src/**/*.{ts,tsx}` com exclusões justificadas; `npm run test:coverage` reporta número por arquivo; thresholds definidos; mocks de `expo-router`, `expo-secure-store` e NativeWind centralizados em um setup único (não repetidos por teste).
- **Arquivos afetados:** `mobile/package.json`, **novo** `mobile/jest.config.js`, **novo** `mobile/jest.setup.ts`
- **Verificação automatizada:** teste-piloto `mobile/src/app/__tests__/smoke.test.tsx` (**novo**) renderizando a tela de login sem erro — prova que a infra funciona e destrava UX-M01..M13.

### EVO-04 — Testes unitários de use case sem Spring (Mockito)
- **Justificativa:** `CLAUDE.md`: "Regras de negócio (RN01-13) vivem em serviços de domínio puros, **testáveis sem Spring**" e "domínio e use cases com unit test". A auditoria observou o oposto: **as únicas classes com teste unitário puro são `GamificationService` e `RefreshTokenHasher`**; toda a lógica de use case — incluindo RN11/12/13 — só é exercitada pelos ITs, que não rodam sem Docker.
- **Objetivo:** Criar uma camada de testes unitários com Mockito para os use cases de ownership e gamificação, de modo que RN11/RN12/RN13 tenham cobertura **independente de Docker**.
- **Critérios de aceitação:** Cada use case de professor e de aluno tem teste unitário cobrindo: caminho feliz, ownership negado, e bypass de ADMIN; os testes rodam em `./mvnw test` (sem container); a suíte de IT deixa de ser o **único** guardião de RN11/12/13.
- **Arquivos afetados:** **novos** testes em `backend/src/test/java/br/com/harmonia/application/**` (`TeacherLessonUseCaseTest`, `AttendanceUseCaseTest`, `StudentMaterialUseCaseTest`, `TeacherMaterialUseCaseTest`, `GoalUseCaseTest`, `CurrentUserServiceTest`)
- **Verificação automatizada:** `./mvnw test` (sem Docker) passa a executar >30 testes unitários; cobertura de `application/**` medida por EVO-01. **Fica mais barato após DEBT-01/DEBT-02.**

### EVO-05 — Adapter real de e-mail (`EmailSenderPort`) com `LogEmailSender` restrito a dev
- **Justificativa:** A auditoria observou que `LogEmailSender` é a **única** implementação de `EmailSenderPort`, **sem `@Profile`** — ou seja, RF02 (recuperar senha por e-mail) não é entregável hoje em nenhum ambiente real, e é exatamente o que torna C-01 crítico em vez de "só um stub de dev".
- **Objetivo:** Implementar um adapter SMTP real (Spring Mail) como implementação de produção da porta, mantendo `LogEmailSender` como implementação de dev/test.
- **Critérios de aceitação:** `SmtpEmailSender` implementa `EmailSenderPort` e é ativado por perfil/propriedade; credenciais SMTP vêm de variáveis de ambiente (nunca hardcoded); `LogEmailSender` anotado com `@Profile("dev","test")`; startup falha rápido se o perfil de produção estiver sem configuração SMTP; e-mail de reset contém **link**, não o token cru em texto de log (BUG-C01).
- **Arquivos afetados:** **novo** `backend/src/main/java/br/com/harmonia/infrastructure/email/SmtpEmailSender.java`, `LogEmailSender.java`, `backend/src/main/resources/application.yml`, `backend/pom.xml`
- **Verificação automatizada:** **novo** `backend/src/test/java/br/com/harmonia/infrastructure/email/SmtpEmailSenderTest.java` (Mockito sobre `JavaMailSender`, sem rede) + teste de contexto afirmando que apenas um bean de `EmailSenderPort` é ativo por perfil. **Depende de BUG-C01.**

### EVO-06 — Criação de meta pelo professor (RF09 + `Goal.createdByTeacher`)
- **Justificativa:** Caminho de código observado e desconectado: `GoalUseCase.create` existe (`GoalUseCase.java:32-41`) mas **nenhuma UI cria meta** (UX-M09), e as colunas `Goal.createdByTeacher`/`Goal.deadline` existem no schema mas **nunca são setadas** (BUG-L03). O professor é o perfil que naturalmente atribui metas (RF09 + RN12).
- **Objetivo:** Permitir que o professor crie meta para um aluno vinculado, preenchendo `createdByTeacher` e `deadline`.
- **Critérios de aceitação:** Endpoint `POST /teacher/students/{id}/goals` com `@PreAuthorize` + checagem de ownership (usando o helper de DEBT-01); `createdByTeacher` preenchido com o professor autenticado; aluno não vinculado → 403; meta criada aparece na lista do aluno; UI mobile do professor para criar a meta.
- **Arquivos afetados:** `backend/src/main/java/br/com/harmonia/application/gamification/GoalUseCase.java`, `.../presentation/teacher/TeacherController.java`, `.../infrastructure/persistence/gamification/Goal.java`, `mobile/src/app/(teacher)/student/[id].tsx`, `mobile/src/features/teacher/teacherService.ts`
- **Verificação automatizada:** **extensão** de `GoalUseCaseTest` (ownership + `createdByTeacher` setado) e de `TeacherFlowIT` (201 para vinculado, 403 para não vinculado); **novo** caso em `mobile/src/app/(teacher)/__tests__/student-detail.test.tsx`.

### EVO-07 — RN02 real: `Teacher.instruments` exposto e gerenciável
- **Justificativa:** Caminho observado: `Teacher.instruments` está **mapeado mas nunca lido nem escrito** (BUG-L04) — RN02 ("professor ensina vários instrumentos") está no schema e no `CLAUDE.md`, mas não tem implementação. RF21/RF23 (gerenciar professores/instrumentos) é o lugar natural.
- **Objetivo:** Expor leitura e edição dos instrumentos de um professor, tornando RN02 verificável.
- **Critérios de aceitação:** Endpoints de leitura e atualização dos instrumentos do professor sob `@PreAuthorize` de admin; a associação é efetivamente persistida e lida; UI admin no web permite associar/desassociar; o dado aparece onde faz sentido (detalhe do professor); RN02 demonstrável na apresentação do TCC.
- **Arquivos afetados:** `backend/src/main/java/br/com/harmonia/infrastructure/persistence/profile/Teacher.java`, `.../application/admin/AdminRegistrationUseCase.java`, `.../presentation/admin/AdminController.java`, `web/src/features/admin/pages/Registrations.tsx`, `web/src/features/admin/adminService.ts`
- **Verificação automatizada:** **novo** `backend/src/test/java/br/com/harmonia/admin/TeacherInstrumentsIT.java` (associa 2 instrumentos, lê de volta, remove 1) + caso RTL na página admin correspondente. **Bloqueio P-1** para o IT.

### EVO-08 — Pipeline de CI para os 3 apps
- **Justificativa:** BUG-H19 registra que "CI quebraria hoje se rodasse lint" — ou seja, **nenhum CI roda lint hoje**; e a Fase 1 não conseguiu rodar os ITs por falta de ambiente. Sem CI, todas as verificações deste plano dependem de execução manual. `CLAUDE.md`: RNF07 (manutenibilidade) e RNF10 (organização do código).
- **Objetivo:** Criar um pipeline (GitHub Actions) que rode build, lint, testes e auditoria de dependências nos três apps a cada push/PR.
- **Critérios de aceitação:** Job backend com serviço Postgres (ou Testcontainers com Docker disponível) rodando `./mvnw verify` + relatório Jacoco (EVO-01); job web rodando `npm ci && npm run lint && npm run build && npm run test:coverage && npm audit --audit-level=high`; job mobile rodando `npm ci && npx tsc --noEmit && npx jest --coverage && npx expo install --check`; guarda anti-regressão de DEBT-10 (grep em `*.md` de instrução de agente) e de BUG-M14 (`web/.env` não rastreado); pipeline vermelho bloqueia merge.
- **Arquivos afetados:** **novo** `.github/workflows/ci.yml`, `backend/pom.xml`, `web/package.json`, `mobile/package.json`
- **Verificação automatizada:** o pipeline é a verificação — validado por um PR de teste que deve passar, e por um PR com erro de lint intencional que deve falhar.

### EVO-09 — Smoke E2E dos três clientes contra o backend real
- **Justificativa:** Pendência **explícita** do `CLAUDE.md`, "Próximos passos" item 10: "⏭️ smoke E2E", repetida nos itens 8 e 9 ("falta smoke test E2E c/ backend no ar") para mobile e web.
- **Objetivo:** Roteiro automatizado (ou semi-automatizado documentado) de smoke ponta a ponta: subir backend + seed, login como `admin`, como professor e como aluno, e percorrer o caminho crítico de cada perfil.
- **Critérios de aceitação:** Script único que sobe `docker compose` + backend e executa os cenários; cenários cobrem RF01 (login), RF07 (registrar prática → XP muda), RF14 (registrar frequência), RF16 (anexar material — incluindo o caso 403 de BUG-C02) e RF28 (admin cria usuário); resultado com PASS/FAIL por cenário; documentado em `docs/` para reprodução na banca do TCC.
- **Arquivos afetados:** **novo** `docs/e2e/smoke.md`, **novo** script em `scripts/` (ou `backend/src/test/java/br/com/harmonia/smoke/SmokeIT.java`), `backend/docker-compose.yml`
- **Verificação automatizada:** o próprio smoke, executável no CI em job opcional/nightly (EVO-08). **Bloqueio P-1.**

### EVO-10 — Paridade Aluno + Professor no cliente web (escopo declarado, nunca executado) — **grande, faseável**
- **Justificativa:** `CLAUDE.md` declara o escopo web como "cliente web completo: **paridade** com o mobile (Aluno + Professor) **+** Configurador Admin", mas o próprio `CLAUDE.md` registra que o Plano 4 foi executado com "escopo **só Admin Configurador** ... Tasks 5-6 de paridade **puladas por decisão**". É uma lacuna de escopo documentada, não uma feature nova.
- **Objetivo:** Reabrir a decisão e, se aprovada, entregar a paridade em fases independentes, reusando a mesma API já consumida pelo mobile.
- **Critérios de aceitação (por fase, cada uma mergeável sozinha):** **Fase 1** — login + dashboard do aluno (RF01/RF03); **Fase 2** — aulas + detalhes + materiais do aluno (RF04/RF05/RF06); **Fase 3** — prática, progresso e metas (RF07/RF08/RF09); **Fase 4** — telas de professor (RF10-RF18). Cada fase reusa `apiClient`/`authService` existentes, respeita o guard de permissão de BUG-M12, tem testes de componente e não regride nenhuma tela admin.
- **Arquivos afetados:** **novos** `web/src/features/student/**`, `web/src/features/teacher/**`, `web/src/App.tsx` (rotas), `web/src/components/layout/AppLayout.tsx`
- **Verificação automatizada:** um arquivo de teste RTL por página nova em `web/src/features/**/__tests__/`, mais cobertura reportada por EVO-02. **Recomendação: só iniciar após os blocos A.1 e A.2 estarem fechados** — expandir superfície com C-03 e H-16..H-19 em aberto multiplica o risco.

---

## Ordem sugerida de execução

> ⚠️ **Isto é uma SUGESTÃO, pendente de aprovação — não é uma decisão tomada.** A Fase 3 (execução) só começa depois de validar (ou reordenar) esta sequência. Nada foi executado.

**Passo 0 — Destravar as verificações (sem isso, boa parte do resto é inverificável)**
- P-1 (ligar Docker Desktop; validar `cd backend && docker compose up -d && ./mvnw verify` — 20 IT)
- EVO-03 (infra de teste mobile — destrava todo o bloco B mobile)
- EVO-01, EVO-02 (cobertura mensurável backend e web)
- DEBT-10 (sanitizar `mobile/AGENTS.md` — custo baixíssimo, risco de processo alto)

**Passo 1 — Refactor barato que barateia o resto**
- DEBT-01, DEBT-02 (extrair as guardas de ownership) — *reduz o custo de BUG-C02, BUG-H05, BUG-M09, BUG-M10, EVO-04, EVO-06*

**Passo 2 — CRITICAL**
- BUG-C01 → BUG-C02 → BUG-C03

**Passo 3 — HIGH de segurança**
- BUG-H01, BUG-H02, BUG-H03, BUG-M15 (logout revoga — pertence ao mesmo tema de sessão)

**Passo 4 — HIGH de integridade de dados e gamificação (diferencial do TCC)**
- BUG-H06, BUG-H07, BUG-H05, BUG-H04, BUG-H08

**Passo 5 — HIGH de confiabilidade dos clientes**
- BUG-H09 (mobile + web) → BUG-H10/UX-M01 → BUG-H11/UX-M02 → BUG-H12/UX-M04 → BUG-H13/UX-M11 → BUG-H15/UX-M08 → BUG-H14
- BUG-H18 → BUG-H17 → BUG-H16 → BUG-H19

**Passo 6 — MEDIUM de banco e backend**
- BUG-M03 (decidir a estratégia de migration **antes** de criar novas), depois BUG-M01, BUG-M06, BUG-M05, BUG-M02, BUG-M04, BUG-M07, BUG-M08, BUG-M09, BUG-M10, BUG-M11

**Passo 7 — MEDIUM dos clientes**
- BUG-M12, BUG-M13, BUG-M14, BUG-M16

**Passo 8 — UX**
- Web: UX-W01, UX-W02, UX-W03, UX-W09, UX-W04, UX-W05, UX-W06, UX-W07, UX-W08
- Mobile: UX-M03, UX-M05, UX-M06, UX-M07, UX-M09, UX-M10, UX-M12, UX-M13

**Passo 9 — LOW e limpeza**
- BUG-L03, BUG-L04, BUG-L01, BUG-L06, BUG-L05, BUG-L02
- DEBT-03, DEBT-04, DEBT-07, DEBT-08, DEBT-09, DEBT-05, DEBT-06

**Passo 10 — Evolução**
- EVO-04, EVO-05, EVO-08, EVO-06, EVO-07, EVO-09, e por último EVO-10 (grande, faseável, só após A.1 e A.2 fechados)

**Notas sobre a ordem**
- Tasks marcadas 🔒 **P-1** exigem a suíte de IT rodando; se o Passo 0 não for feito, elas entram na Fase 3 sem verificação automatizada — e isso precisa ser aceito explicitamente.
- Tasks mobile marcadas 🔒 **P-2** dependem de EVO-03; sem ela, nenhum critério de aceitação mobile é verificável por teste.
- Pares consolidados (executar como unidade única, não como duas tasks): BUG-H10+UX-M01, BUG-H11+UX-M02, BUG-H12+UX-M04, BUG-H13+UX-M11, BUG-H15+UX-M08.
- BUG-M03 deve ser decidido **antes** de qualquer task que crie migration nova (BUG-H07, M01, M02, M05, M06, L03, L05, L06), para não empilhar risco de checksum.
