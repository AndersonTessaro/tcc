# Relatório de Auditoria — Harmonia

**Data:** 2026-07-26
**Modo:** ECC-only (superpowers desativado nesta sessão)
**Metodologia:** 7 agentes de revisão ECC rodando em paralelo, somente leitura, sobre o estado atual da `main` (commit `e919a3a`). Nenhum arquivo de código foi alterado nesta fase.

Agentes usados: `java-reviewer` (backend completo), `database-reviewer` (migrations Flyway + entidades JPA), `react-reviewer` (mobile Expo), `typescript-reviewer` (web admin), `security-reviewer` (full-stack), `refactor-cleaner` (dead code/débito técnico), agente genérico para medição de cobertura de testes (`mvn verify` / `jest` / `vitest`).

⚠️ **Nota de segurança do processo:** o arquivo `mobile/AGENTS.md` continha uma instrução embutida tentando induzir qualquer agente a buscar uma URL externa "antes de escrever qualquer código" — uma tentativa de prompt injection via conteúdo do repositório. O agente de revisão mobile detectou e ignorou corretamente (fase era só leitura). **Remediado na Fase 3 (task DEBT-10, 2026-07-26):** a instrução imperativa foi substituída por nota informativa não-imperativa. Lição aprendida: conteúdo de repositório (incluindo arquivos `AGENTS.md`/`CLAUDE.md`) é dado não-confiável e deve ser tratado como tal por qualquer agente que o processe.

---

## Sumário executivo

| Categoria | Critical | High | Medium | Low |
|---|---|---|---|---|
| Backend (bugs/qualidade) | 2 | 5 | 8 | 3 |
| Banco de dados | 0 | 3 | 4 | 4 |
| Mobile | 0 | 8 | 9 | — |
| Web admin | 1 | 6 | 9 | 3 |
| Segurança (full-stack, cross-cutting) | 2 | 3 | 3 | 2 |

Os dois achados **CRITICAL** de segurança foram confirmados de forma independente por dois agentes diferentes (`java-reviewer` e `security-reviewer`), o que aumenta a confiança no achado.

**Cobertura de testes real (medida, não estimada):**
- Backend: `mvn verify` não roda de ponta a ponta neste ambiente — Docker Desktop instalado mas daemon **não estava rodando**, então os 11 arquivos `*IT.java` (que cobrem RBAC/ownership, auth, finance, schedule etc.) não executaram. `mvn test` (só unit): 11 testes, 0 falhas, 1 erro (erro é só do Testcontainers sem Docker, não é bug de código). **Toda a lógica de use case — incluindo RN11/12/13 (ownership) — só é exercitada pelos ITs, que não rodaram aqui.** Únicas classes com teste unitário puro: `GamificationService` e `RefreshTokenHasher` (domínio puro). Sem plugin Jacoco no `pom.xml` → % de cobertura não é mensurável mesmo quando os testes rodam.
- Mobile: 1 arquivo de teste (`apiClient.test.ts`) de 46 arquivos-fonte. 78% statements *só nesse arquivo*; 0% no resto (todas as telas, todos os services, `useAuth`).
- Web: 1 arquivo de teste (`apiClient.test.ts`, mesma lógica) de ~23 arquivos-fonte. Sem `@vitest/coverage-v8` instalado → % não mensurável. 0% nas páginas admin (Users, Roles, Permissions, Finance, Settings, Registrations).

**Conclusão:** nenhum dos três apps tem cobertura real de teste fora do cliente HTTP. A lógica de negócio mais sensível do projeto (RN01-13, ownership, RBAC/PBAC, cálculo de XP) está descoberta ou só coberta por ITs que não puderam rodar neste ambiente.

---

## 1. Bugs e Qualidade de Código

### 1.1 CRITICAL

**[C-01] Token de reset de senha vazado em texto plano nos logs — permite account takeover**
Achado por: `java-reviewer` + `security-reviewer` (independentemente).
- `backend/src/main/java/br/com/harmonia/application/security/PasswordResetUseCase.java:40-41` monta o corpo do e-mail com o token bruto: `"Use este token para redefinir sua senha: " + raw`.
- `backend/src/main/java/br/com/harmonia/infrastructure/email/LogEmailSender.java:13` loga esse corpo em nível `INFO`: `log.info("EMAIL -> {} | {} | {}", to, subject, body)`.
- `LogEmailSender` é a **única** implementação de `EmailSenderPort` no código (não há adapter SMTP/SES real, não é `@Profile`-gated) — ou seja, é o caminho vigente em qualquer ambiente hoje, não um stub de dev isolado.
- **Causa raiz:** token tratado como dado de negócio logável em vez de segredo. Quem tiver acesso a logs/observabilidade consegue token válido (30 min) de qualquer usuário que pediu reset.

**[C-02] Bypass de autorização (IDOR) — professor anexa material a qualquer aluno, não só vinculados (viola RN12)**
Achado por: `java-reviewer` + `security-reviewer` (independentemente).
- `backend/src/main/java/br/com/harmonia/application/material/TeacherMaterialUseCase.java:31-48` (`attach()`) só faz `students.findById(studentId).orElseThrow()` — nunca verifica se o aluno está vinculado (via `Enrollment`) ao professor autenticado.
- Todos os outros use cases do professor fazem essa checagem: `TeacherLessonUseCase.teacherEnrollment()`, `AttendanceUseCase.register()`, `MakeupUseCase.create()`, `ScheduleUseCase.create()`, `TeacherUseCase.studentDetail()`. `TeacherMaterialUseCase.attach()` é a exceção.
- Endpoint afetado: `POST /teacher/students/{id}/materials`. Sem teste de integração cobrindo o caso de ownership (existe teste 403 equivalente em `TeacherFlowIT` para outro endpoint, mas não para este).
- **Exploit:** qualquer professor autenticado com `material.manage` anexa arquivo a UUID de aluno arbitrário no sistema inteiro.

**[C-03] Tokens JWT (access + refresh) em `localStorage` no cliente web admin**
Achado por: `security-reviewer` + `typescript-reviewer` (independentemente).
- `web/src/lib/http/authStorage.ts:1-17` — ambos os tokens em `localStorage`, legível por qualquer script rodando na página.
- Agravante real (não só teórico): `react-router-dom` instalado (`^7.16.0`) tem advisory de XSS aberto (ver H-03) — ou seja, já existe uma superfície de XSS conhecida na própria dependência de rota do app que gerencia usuários/roles/finance.
- **Fix:** cookie httpOnly+Secure+SameSite (requer proxy/BFF ou endpoint de sessão no backend), ou pelo menos manter refresh token só server-side.

### 1.2 HIGH

**[H-01] Password reset / desativação de conta não revogam refresh tokens existentes**
- `PasswordResetUseCase.reset()`, `SecurityAdminUseCase.resetPassword()`/`setStatus()`, `AuthUseCase.refresh()` — nenhum revoga tokens de refresh já emitidos, e não existe `findByUser`/revoke-all no `RefreshTokenRepository`.
- **Exploit:** atacante com refresh token roubado continua renovando access tokens por até 7 dias mesmo após troca de senha ou desativação da conta pelo admin — o controle de "desativar conta" (crítico para incident response) é totalmente contornado.

**[H-02] Sem rate limiting em `/auth/login`, `/auth/refresh`, `/auth/forgot-password`**
- `SecurityConfig.java:58-61` marca as três rotas `permitAll()`; nenhuma lib de rate limit (Bucket4j/resilience4j) existe no projeto. RF01 pede rate limiting explicitamente nos requisitos.

**[H-03] `react-router-dom` vulnerável na versão instalada (web)**
- `web/package.json:15`, `^7.16.0` — advisories: open redirect via backslash em `<Link>`/`useNavigate`, XSS por falta de validação de protocolo, DoS não autenticado, CSRF bypass em modo RSC. Fix: `npm audit fix` / bump de versão.

**[H-04] N+1 sistêmico — todo `@ManyToOne`/`@OneToOne` é EAGER por padrão, `User.roles`/`Role.permissions` explicitamente EAGER**
Achado por: `java-reviewer` + `database-reviewer` (independentemente).
- Nenhuma entidade declara `fetch = FetchType.LAZY` em `infrastructure/persistence/**`. Carregar qualquer `User` dispara 1 query de roles + 1 por role para permissions; endpoints como `TeacherUseCase.linkedStudents()`/`dashboard()` (dashboard do professor, todo load) e `SecurityAdminUseCase.users()` (tela de admin) arrastam a cadeia inteira `Enrollment → Student/Teacher → User → roles → permissions`.
- Nenhum repositório usa `@EntityGraph`/`JOIN FETCH` em lugar nenhum do código.

**[H-05] Sem tratamento centralizado de "não encontrado" → 500 em vez de 404**
- `GlobalExceptionHandler` não mapeia `NoSuchElementException`/`IllegalStateException`. Dezenas de `.orElseThrow()` sem handler: `StudentLessonUseCase.java:36`, `TeacherLessonUseCase.java:31`, `AttendanceUseCase.java:37`, `MakeupUseCase.java:33`, `ScheduleUseCase.java:35`, `StudentMaterialUseCase.java:33`, `TeacherMaterialUseCase.java:37`, `AdminRegistrationUseCase.java:72-74`, `AuthController`/`AuthUseCase`, `CurrentUserService.java:28`.

**[H-06] Gamificação: XP não-idempotente e sem limites — pode ser manipulado**
- `AttendanceUseCase.java:36-58` re-concede +20 XP toda vez que `register()` roda com `PRESENT`, mesmo se já existe registro para aquela aula. Sem reversão se status muda para não-`PRESENT`.
- `PracticeUseCase.java:32,44-55` + `StudentController.java:45,88-90`: `date` da prática é 100% controlado pelo cliente, sem validar que não é data futura; sem limite de submissões por dia real → XP e streak manipuláveis (viola integridade esperada por RN07).

**[H-07] Race condition em `Progress` — sem lock otimista, updates perdidos sob concorrência**
- `infrastructure/persistence/gamification/Progress.java` sem campo `@Version`. `PracticeUseCase.register` e `AttendanceUseCase.register` fazem read-modify-write na mesma linha `Progress` — duas requisições concorrentes perdem uma atualização silenciosamente.

**[H-08] Entidades JPA retornadas direto pelos controllers — sem DTO na borda**
- Viola a própria regra do `CLAUDE.md` do projeto. `StudentController`, `TeacherController`, `SecurityAdminController.users()/roles()/permissions()`, Finance/Setting controllers — todos retornam entidade JPA direto. `Student` embute `User` completo (email, `active`, `emailVerified`, id) sem projeção.

**[H-09] Refresh token: race condition de concorrência (mobile + web) pode derrubar sessão válida**
Achado por: `react-reviewer` + `typescript-reviewer` (independentemente, mesmo bug em ambos os clientes).
- `mobile/src/lib/http/apiClient.ts:15-47` e `web/src/lib/http/apiClient.ts` não deduplicam refresh concorrente. Backend faz rotação single-use (`AuthUseCase.refresh()` revoga o token usado) — duas chamadas 401 simultâneas fazem a segunda falhar com token já revogado → logout forçado mesmo com sessão válida.

**[H-10] Mobile: sem restauração de sessão no cold start**
- `mobile/src/features/auth/useAuth.tsx:14-23` nunca lê `tokenStorage`/chama `authService.me()` no mount. `authService.me` existe mas nunca é chamado. Todo fechar/abrir o app força novo login mesmo com refresh token válido no SecureStore.

**[H-11] Mobile: erro de login sempre genérico, mascara causa real**
- `apiClient.ts` trata `/auth/login` com a mesma lógica de retry-refresh de rotas autenticadas; qualquer falha vira "Login ou senha inválidos" mesmo sendo erro de rede/servidor.

**[H-12] Mobile: sem refetch-on-focus — dados ficam obsoletos entre tabs**
- Toda tela usa `useEffect(() => {...}, [])`; nenhum uso de `useFocusEffect`. Ex.: registrar prática não atualiza XP no dashboard até reiniciar o app.

**[H-13] Mobile: sem guard de double-submit em ações que mutam estado**
- `practice.tsx`, `new-lesson.tsx`, `schedule.tsx` (botões de presença) sem `disabled`/estado de "busy" — double-tap duplica registro de presença ou conta XP em dobro (crítico por tocar RN07/gamificação, diferencial do projeto).

**[H-14] Mobile: acessibilidade zero em todo o app**
- Nenhum `accessibilityLabel`/`accessibilityRole`/`accessibilityState` em nenhum `Pressable`/`TextInput` do projeto inteiro (grep confirmou).

**[H-15] Mobile: RF18 (relatórios pedagógicos) implementado no backend mas não conectado no mobile**
- `mobile/src/app/(teacher)/reports.tsx` é cópia idêntica de `students.tsx` — nunca chama `teacherService.reports(studentId)`, que existe mas não é usado em lugar nenhum.

**[H-16] Web: nenhum Error Boundary na árvore de render**
- `main.tsx`/`App.tsx` sem `<ErrorBoundary>` — qualquer exceção não tratada em render quebra a SPA inteira para tela branca.

**[H-17] Web: cast sem validação de runtime na resposta da API**
- `web/src/lib/http/apiClient.ts:53`: `res.json() as Promise<T>` sem validação de schema (zod/yup). Drift de contrato do backend vira `undefined` dentro de componente em vez de erro claro na borda.

**[H-18] Web: erro HTTP descarta corpo da resposta**
- `apiClient.ts:51`: `throw new Error(\`HTTP_${res.status}\`)` perde a mensagem de validação do backend. Callers fazem string-matching frágil (`msg.includes("401")` em `Login.tsx:24`).

**[H-19] Web: 6 erros de ESLint confirmados (`eslint . --ext .ts,.tsx`)**
- `useAuth.tsx:26` `react-hooks/set-state-in-effect`; `useAuth.tsx:51` `react-refresh/only-export-components`; mesmo padrão `set-state-in-effect` repetido em `Finance.tsx:25`, `Roles.tsx:25`, `Settings.tsx:26`, `Users.tsx:23`. CI quebraria hoje se rodasse lint.

### 1.3 MEDIUM (resumo consolidado, ver detalhe completo nos relatórios brutos dos agentes)

- Índices ausentes em várias FKs (`class_group.teacher_id/instrument_id`, `enrollment.instrument_id/class_group_id`, `material.teacher_id`, `financial_transaction.student_id` etc.) — `database-reviewer`.
- `TIMESTAMP` sem timezone em 15 ocorrências, incluindo expiração de token (`auth_refresh_token.expires_at`) — risco em deploy com TZ diferente entre app/DB — `database-reviewer`.
- 3 migrations Flyway (V1, V3, V4, V5) foram **editadas/reescritas in-place após já usadas** entre commits — risco de checksum mismatch em qualquer DB dev real que já tenha migrado (Testcontainers mascara isso pois é sempre efêmero) — `database-reviewer`.
- Saldo financeiro calculado via `findAll().stream().reduce(...)` em Java em vez de agregação SQL (`FinanceUseCase.java:29-33`) — carrega tabela inteira a cada consulta — `database-reviewer` + `java-reviewer`.
- Colunas tipo-enum (`status`, `type`) sem `CHECK` constraint no banco — nada impede `UPDATE` fora da aplicação gravar valor inválido — `database-reviewer`.
- Índice redundante em `auth_refresh_token.token_hash` (coluna já é `UNIQUE`) — `database-reviewer` + `java-reviewer`.
- Sem paginação em `/admin/security/users`, `/admin/finance/transactions`, `/me/materials`, `/me/goals`, `/teacher/students`, `/teacher/lessons` — `java-reviewer`.
- Sem `@Transactional(readOnly = true)` em métodos só-leitura — `java-reviewer`.
- Validação fraca: `updateGoalProgress` aceita `progress` negativo/sem teto; sem checagem `endTime > startTime` em aula/horário/reposição — `java-reviewer`.
- Sem allow-list de tipo/tamanho de arquivo no upload de material (RF16) — depende só do limite default do Spring — `security-reviewer`.
- Web: nenhuma tela admin tem checagem de permissão fina por domínio (`finance.manage`, `settings.manage`) — só um guard grosso no nível de rota `/admin` — `typescript-reviewer`.
- Web: sem `AbortController`/guarda de stale-response em nenhum efeito de fetch — `typescript-reviewer`.
- Web: `.env` commitado no git (não é segredo hoje, só a URL localhost, mas sem `.env.example` e sem exclusão) — `typescript-reviewer`.
- Web: senha resetada via `window.prompt()` nativo, sem confirmação — `typescript-reviewer` (também listado em UX).
- Logout do admin web não revoga refresh token no backend (só limpa storage local) — `security-reviewer`.
- Dependências de dev vulneráveis (`esbuild`, `postcss`, `brace-expansion` no web; `shell-quote`, `uuid` no mobile) — build-time only, não vão pro bundle — `security-reviewer`.

### 1.4 LOW (resumo)

- `BaseEntity` (`@MappedSuperclass`) declarado mas nunca estendido por nenhuma entidade.
- IDs inconsistentes: maioria `UUID`, mas `Role`/`Permission` usam `IDENTITY` (Long).
- `Goal.createdByTeacher`/`Goal.deadline` existem no schema mas nunca são setados por `GoalUseCase.create`.
- `Teacher.instruments` mapeado mas nunca lido/escrito — RN02 sem implementação real apesar do schema suportar.
- `VARCHAR(n)` arbitrário em vários campos de texto livre sem regra de negócio por trás do limite.
- `ON DELETE` inconsistente entre FKs (`CASCADE` em algumas, `RESTRICT` implícito em outras) sem documentação de intenção.

---

## 2. Interface e UX

### Mobile
1. **Sem persistência de login** — força novo login a cada abertura do app mesmo com sessão válida no SecureStore → restaurar sessão via `authService.me()` no mount do `AuthProvider`, com tela de loading até resolver.
2. **Mensagem de erro de login sempre genérica** — não distingue rede/servidor/credencial inválida.
3. **Sem pull-to-refresh** em nenhuma lista/dashboard.
4. **Dados obsoletos entre tabs** (prática → XP no dashboard, presença → relatório do aluno) — falta refetch-on-focus.
5. **Esqueci senha sem loading/erro** — sempre mostra "se o e-mail existir..." mesmo em falha de rede real.
6. **Sem seletor de data/hora em "Nova aula"** — campos de texto livre com placeholder de formato.
7. **Sem confirmação antes de "Sair"**.
8. **Aba "Relatórios" é cópia confusa da aba "Alunos"** — mesma lista, mesmo destino de navegação, nunca mostra dado de relatório de fato (RF18 desconectado, ver H-15).
9. **Sem forma de criar Meta** apesar da UI sugerir gerenciamento (RF09).
10. **Alvos de toque pequenos** nos filtros ("Próximas"/"Passadas", "Ativas"/"Concluídas") — abaixo do mínimo recomendado 44x44pt.
11. **Proteção contra double-submit inconsistente** entre telas — algumas desabilitam botão durante ação, outras não (ver H-13).
12. **Sem mensagem de rede offline** em lugar nenhum — falha de conexão parece idêntica a "sem dados".
13. **Botões de presença não indicam status atual já marcado** para a aula.

### Web Admin
1. **Reset de senha via `window.prompt()`** nativo — sem máscara, sem confirmação, sem validação inline → trocar por modal com campo mascarado + confirmação.
2. **Campo "Valor" (Finance) não aceita vírgula decimal brasileira** ("12,50" → `NaN`) → normalizar ou usar input com máscara de moeda.
3. **Toasts de erro genéricos e idênticos** em toda tela admin, independente da causa real.
4. **Checkboxes de role/permissão sem estado pendente/disabled** durante a requisição.
5. **Formulário de matrícula exige UUIDs digitados à mão**, erro vago "verifique os IDs" → trocar por selects buscáveis.
6. **Tabelas sem `scope="col"`, botões de ação sem `aria-label` identificando a linha** — gap de acessibilidade.
7. **Loading state substitui a página inteira** por `<p>Carregando...</p>` em vez de manter chrome + skeleton na área de dados.
8. **"Esqueci senha" mostra sucesso mesmo em falha de rede real**, mascarando problema de conectividade.
9. **Sem confirmação antes de ações destrutivas** (desativar usuário, resetar senha) — clique único executa na hora.

---

## 3. Débito Técnico (somente listagem, nada removido)

### Dead code
| Arquivo | O quê | Por quê morto |
|---|---|---|
| `mobile/src/components/app-tabs.tsx` + `.web.tsx` | Componente de tabs customizado | Nunca importado — navegação real usa `Tabs` do `expo-router` direto |
| `mobile/src/components/animated-icon.tsx` + `.web.tsx` + `.module.css` | Splash/ícone animado | Não importado em lugar nenhum |
| `mobile/src/components/themed-text.tsx`, `themed-view.tsx`, `external-link.tsx` | Scaffold Expo | Só referenciados pelo `app-tabs.web.tsx` morto |
| `mobile/src/components/hint-row.tsx`, `ui/collapsible.tsx`, `web-badge.tsx` | Scaffold Expo | Zero referências |
| `mobile/src/constants/theme.ts:64` | `export const BottomTabInset` | Nunca importado |
| `mobile/src/features/auth/authService.ts:31` | `export const isStudent` | Zero call sites (irmão `isTeacher` é usado) |
| `web/src/features/auth/authService.ts:23` | `export const has` | Zero call sites |

### Duplicação
| Onde | O quê | Ação sugerida |
|---|---|---|
| `AttendanceUseCase`, `MakeupUseCase`, `ScheduleUseCase`, `TeacherLessonUseCase` (backend) | Guarda de ownership de professor copiada 4x | Extrair `CurrentUserService.assertOwnedByCurrentTeacher(...)` |
| `StudentMaterialUseCase`, `GoalUseCase`, `StudentLessonUseCase` (backend) | Guarda de ownership de aluno copiada 3x | Extrair `CurrentUserService.assertOwnedByCurrentStudent(...)` |
| `mobile/src/lib/http/authEvents.ts` vs `web/src/lib/http/authEvents.ts` | Pub/sub idêntico byte-a-byte | Melhor candidato a módulo compartilhado (zero dependência de plataforma) |
| `mobile/.../apiClient.ts` vs `web/.../apiClient.ts` | Lógica de retry/refresh quase idêntica | Consolidação maior — exigiria workspace compartilhado, não é ganho rápido |
| Tipo `AuthResponse` duplicado em mobile e web | Mesma forma `{accessToken, refreshToken, username, authorities}` | Baixa urgência hoje |

### Dependências não usadas
- Mobile: `@expo/ui`, `expo-device`, `expo-glass-effect`, `expo-status-bar`, `expo-system-ui` (remover); `jest` está em `dependencies` em vez de `devDependencies` (mover); `expo-updates` usado em `app.json` mas **não declarado** em `package.json` (adicionar — risco inverso).
- Web: `@testing-library/react` sem uso (só `jest-dom` é usado).

### Scaffolding nunca limpo
- `mobile/README.md`, `mobile/LICENSE` (copyright da Expo/650 Industries), `mobile/scripts/reset-project.js`, `web/README.md`, `backend/HELP.md` (já gitignored) — todos ainda com conteúdo genérico de template, nunca customizados para o projeto.

### TODOs/FIXMEs
Nenhum encontrado (grep limpo em `backend/src`, `mobile/src`, `web/src`).

### Arquivos/funções grandes demais
Nenhum viola as convenções do próprio `CLAUDE.md` (>800 linhas/arquivo, >50 linhas/função) — maior arquivo é `StudentController.java` (115 linhas), maior tela web é `Users.tsx` (123 linhas).

---

## Próximos passos

Aguardando validação deste relatório antes de prosseguir para a **Fase 2** (planejamento e quebra em tasks). Sugestão de prioridade para a Fase 2, sujeita à sua aprovação:

1. Bloco de segurança (C-01, C-02, C-03, H-01, H-02, H-03) — maior risco, menor esforço relativo.
2. Bloco de integridade de dados/gamificação (H-04 a H-09) — toca o diferencial do TCC (XP/streak).
3. Bloco de confiabilidade dos clientes (H-09 a H-19) — sessão, race conditions, error boundaries.
4. Débito técnico (limpeza) — baixo risco, pode ir em paralelo a qualquer momento.
5. UX — após os blocos acima, ou intercalado conforme prioridade sua.
