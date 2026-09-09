# Harmonia — Gestão Musical

App mobile para gestão de aulas de música (TCC). Acompanhamento pedagógico de alunos,
controle de atividades de professores e administração da escola. Diferencial: **gamificação**
do aluno (XP, nível, sequência/streak, metas, progresso).

> Documento de requisitos original: `C:\Users\rafae\Downloads\documento_requisitos_harmonia_completo.docx`

---

## Stack

**Backend** — Java 25 + Spring Boot 4
- Spring Web (REST), Spring Data JPA, Spring Security + JWT (RSA)
- PostgreSQL + Flyway (migrations)
- Validation (Jakarta Validation), MapStruct (DTO mapping), Lombok
- Storage de arquivos/materiais (RNF08): local em dev, S3-compatível em prod
- Build: Maven ou Gradle (a definir na fase de scaffolding)

**Mobile** — React Native + Expo (TypeScript)
- Expo Router (file-based routing), NativeWind (Tailwind no mobile)
- Cliente HTTP com JWT (padrão marreh: access + refresh token)
- Build/distribuição: EAS

**Web** — React + Vite + TypeScript (`web/`, pós-MVP)
- Cliente web completo: **paridade** com o mobile (Aluno + Professor) **+** Configurador Admin (usuários, roles, permissões, config). Tailwind + shadcn/ui (igual marreh-intranet). Consome a mesma API.

**Estrutura** — Monorepo
```
tcc_anderson/
├── backend/    ← Maven multi-módulo (Java 25)
│   ├── lesson-core/  ← módulo "framework": agendamento/presença/reposição, Java puro, ZERO Spring/JPA
│   └── harmonia-app/ ← Spring Boot 4, consome lesson-core via dependency
├── mobile/     ← Expo / React Native (Aluno + Professor) — MVP
├── web/        ← React + Vite (Aluno + Professor + Admin) — pós-MVP
└── docs/       ← specs, diagramas (UML, ER), planos
```

**Banco** — PostgreSQL, migrations versionadas via Flyway.

---

## Escopo

**MVP — Aluno + Professor** (telas no Figma, valor pedagógico) + **fundação de segurança completa**
(RBAC+PBAC, JWT RSA, refresh token — construída desde o início).
**Pós-MVP — Web** (`web/`): cliente web com paridade Aluno+Professor (mesma API do mobile) **+**
Configurador Admin (login admin, gestão de usuários/roles/permissões, config). Depois: financeiro,
matrículas, turmas, relatórios. Sem Figma p/ web/admin — design por conta.

### Perfis
- **Aluno** — acompanha aulas, registra práticas, vê materiais, metas, progresso, frequência.
- **Professor** — registra aulas, controla frequência, anexa materiais, agenda, evolução dos alunos.
- **Administrador** — gestão geral (alunos, professores, matrículas, financeiro, relatórios, horários, permissões).

---

## Referências do Figma

**Arquivo:** TCC APP DE MÚSICA
`https://www.figma.com/design/Knfsw9IIzliM6o9KgLbRhG/TCC-APP-DE-M%C3%9ASICA`
- fileKey: `Knfsw9IIzliM6o9KgLbRhG`

Deep link por tela: trocar `node-id=` (formato `X-Y`).

| Tela | node-id | Link |
|------|---------|------|
| Seção: Telas do Aluno | `2-3` | `?node-id=2-3` |
| Seção: Telas do Professor | `61-301` | `?node-id=61-301` |
| Login | `61-303` | `?node-id=61-303` |
| Dashboard (Aluno) | `15-32` | `?node-id=15-32` |
| Minhas Aulas | `37-107` | `?node-id=37-107` |
| Detalhes da Aula | `37-215` | `?node-id=37-215` |
| Metas Ativas | `48-260` | `?node-id=48-260` |
| Dashboard (Professor) | `61-346` | `?node-id=61-346` |
| Alunos (lista) | `69-478` | `?node-id=69-478` |

**Telas mapeadas**
- **Comuns:** Login, Esqueci a senha, Cadastre, Mais (Menu)
- **Aluno:** Dashboard (XP, nível, sequência, prática semanal, próxima aula), Minhas Aulas
  (próximas/passadas), Detalhes da Aula (canto/piano/guitarra/violão), Metas Ativas,
  Metas Concluídas, Progresso/XP
- **Professor:** Dashboard (aulas hoje, alunos, frequência média, próximas), Alunos (lista,
  detalhes, aulas, frequência), Nova Aula (conteúdo/tarefa/exercícios/anexos), Calendário,
  Relatórios (desempenho/evolução/prática/frequência), Mais → Financeiro, Reposições,
  Horários, Turmas, Configurações

> Para ler design/screenshot: usar MCP Figma (`get_design_context`, `get_screenshot`) com
> o `fileKey` e o `node-id` acima.

---

## Requisitos

### Funcionais (RF)
**Auth:** RF01 login (e-mail+senha) · RF02 recuperar senha por e-mail.

**Aluno:** RF03 dashboard (XP, nível, sequência, prática semanal, próxima aula) ·
RF04 consultar aulas (próximas/passadas) · RF05 detalhes da aula (data, horário, instrumento,
professor, conteúdo, tarefa, anexos) · RF06 materiais (ver/buscar/baixar) · RF07 registrar
prática (atualiza XP/progresso) · RF08 visualizar progresso · RF09 gerenciar metas.

**Professor:** RF10 dashboard · RF11 listar alunos vinculados · RF12 detalhes do aluno ·
RF13 registrar aula (conteúdo/tarefa/anexos) · RF14 registrar frequência (presença/falta/
justificada) · RF15 histórico de aulas · RF16 anexar material ao aluno · RF17 agenda ·
RF18 relatórios pedagógicos.

**Admin (fase 2):** RF19 dashboard · RF20 gerenciar alunos · RF21 professores · RF22 matrículas
(aluno+professor+instrumento+turma) · RF23 instrumentos · RF24 turmas · RF25 horários ·
RF26 reposições (gera nova aula vinculada à original) · RF27 financeiro (receitas/despesas/saldo) ·
RF28 usuários e permissões · RF29 configurações · RF30 relatórios administrativos.

### Não Funcionais (RNF)
RNF01 interface intuitiva · RNF02 funcionar em mobile · RNF03 autenticação segura ·
RNF04 permissões por perfil · RNF05 integridade dos dados · RNF06 bom desempenho ·
RNF07 manutenibilidade · RNF08 armazenamento de arquivos · RNF09 escalabilidade ·
RNF10 organização do código.

### Regras de Negócio (RN)
- RN01 aluno pode estudar vários instrumentos · RN02 professor ensina vários instrumentos ·
  RN03 professor tem várias turmas.
- RN04 aulas são **individuais** por aluno · RN05 turmas só p/ controle/organização.
- RN06 materiais anexados pelo professor **direto ao aluno**.
- RN07 XP calculado com base em prática + frequência · RN08 frequência por aula ·
  RN09 sem presença registrada = falta.
- RN10 reposição gera nova aula vinculada à original.
- RN11 aluno vê só o que é da sua conta · RN12 professor vê só alunos vinculados ·
  RN13 admin tem acesso completo. **(reforça RNF04 — autorização por perfil)**

### Entidades principais
Usuário, Aluno, Professor, Administrador, Instrumento, Matrícula, Turma, Aula, Frequência,
Reposição, Prática, Meta, Progresso, Material, Anexo de Aula, Horário, Movimentação Financeira,
Relatório, Permissão, Configuração.

---

## Arquitetura & Princípios

**Inegociável: Clean Architecture + SOLID + boas práticas em todo o código (back e front).**

### Backend — Clean Architecture
Dependências apontam **sempre para dentro** (domínio não conhece infra/framework).

```
domain/        ← entidades de negócio, regras (RN), value objects. ZERO dependência de Spring/JPA.
application/   ← use cases (serviços de aplicação), portas (interfaces), orquestração. Depende só de domain.
infrastructure/← adapters: repositórios JPA, JWT, storage S3, integrações. Implementa as portas.
presentation/  ← controllers REST, DTOs, mappers. Traduz HTTP ↔ use case.
```
- **Clean Architecture pragmática (estilo marreh):** entidades JPA ficam na `infrastructure`; o domínio **puro** (sem Spring/JPA) é reservado às **regras de negócio** (cálculo de XP/nível/streak, validação de frequência, ownership). Sem POJO+mapper para toda entidade — evita boilerplate.
- Use cases dependem de **portas (interfaces de repositório)**, não de implementações concretas (DIP). Spring Data implementa as portas.
- Regras de negócio (RN01-13) vivem em **serviços de domínio puros**, testáveis sem Spring.

### SOLID
- **S** — uma responsabilidade por classe; use case faz uma ação.
- **O** — extensão via novas implementações de porta, sem editar o núcleo.
- **L** — implementações de porta substituíveis sem quebrar o contrato.
- **I** — interfaces pequenas e específicas por caso de uso.
- **D** — núcleo depende de abstrações; Spring injeta as implementações.

### Frontend — camadas
```
features/<feature>/  ← UI + lógica por domínio (aluno, professor, aulas, metas...)
  components/         ← componentes de apresentação (burros, recebem props)
  hooks/             ← lógica de estado/efeitos
  services/          ← chamadas à API (porta), tipadas
domain/ ou types/    ← modelos de domínio tipados, independentes da UI
lib/http/            ← cliente HTTP central (JWT, refresh, tratamento de erro)
```
- Componentes de apresentação separados da lógica (hooks/services) — SRP no front.
- Service = única fonte de chamadas à API; UI não chama `fetch` direto (DIP/inversão).
- Sem prop drilling profundo; estado no nível certo.

## Convenções

- Backend organizado por **feature/domínio** dentro das camadas Clean (não pacote técnico gigante).
- Migrations Flyway versionadas; nunca editar migration já aplicada.
- Autorização por perfil em toda rota (RN11/RN12/RN13) — aluno e professor só acessam dados vinculados.
- DTOs nas bordas; entidade JPA / modelo de domínio **não vaza** para o controller.
- Nomes que revelam intenção; funções curtas; sem comentário óbvio (código se explica).
- Testes: domínio e use cases com unit test (sem Spring); integração nas bordas.
- Mobile: componentes focados, estilo via NativeWind, chamadas via cliente HTTP central com refresh de token.
- **Idioma do código: INGLÊS em tudo.** Classes, métodos, variáveis, pacotes, DTOs, **endpoints REST**, **campos JSON**, **tabelas e colunas do banco**, nomes de permissão (`student.read`) e roles (`STUDENT`/`TEACHER`/`ADMIN`) — todos em inglês. **Único conteúdo em português: texto exibido na tela** (labels, mensagens, placeholders, toasts). Glossário canônico PT→EN em `docs/glossario-en.md` — consultar antes de nomear.

## Segurança & Autenticação (espelha marreh_spring_integrations)

**Modelo RBAC + PBAC completo desde o MVP** (não usar enum de perfil simples).

- **Usuario —n:n— Role —n:n— Permission.** `Usuario` implementa `UserDetails`; autoridades = `ROLE_<name>` + permissões.
- **JWT RSA** (access curto) + **Refresh Token** (longo, `token_hash` SHA-256 no Postgres, `revoked_at`). Sessão **stateless**. Senha **BCrypt**.
- Endpoints base: `POST /auth/login` · `POST /auth/refresh` · `GET /auth/me` · recuperação de senha (RF02).
- **Autorização em 2 camadas:**
  1. `@PreAuthorize("hasRole('ADMIN') or hasAuthority('aula.manage')")` — qual ação (PBAC).
  2. Filtro de **ownership** no use case — de quem é o dado (RN11 aluno só o seu, RN12 professor só vinculados). Permissão sozinha não basta.
- Permissões nomeadas `dominio.acao` (`aula.manage`, `auth.user.manage`, ...). Roles seed: `ALUNO`, `PROFESSOR`, `ADMIN`. ADMIN faz bypass de ownership (RN13).
- **Configurador Admin** (`admin-web/`, pós-MVP) = UI sobre esse backend: CRUD de usuários, montar roles com permissões, config. Equivale ao `SecurityAdminController` do marreh.

> Catálogo completo de permissões + seed de roles em `docs/modelo-de-dados.md`.

## Boot 4 — gotchas (descobertos no Plano 1; aplicar nos próximos)

Os planos foram escritos com premissas Spring Boot 3. Diferenças reais do Boot 4:
- **Parent** `4.0.6` (não `4.0.6.RELEASE` — o Initializr devolve `.RELEASE`, que não existe no Central).
- **Starters renomeados:** `spring-boot-starter-webmvc` (não `-web`), `spring-boot-starter-flyway`, `spring-boot-starter-security-oauth2-resource-server`. Test starters split por módulo (`spring-boot-starter-webmvc-test`, etc.).
- **JSON é opt-in:** adicionar `spring-boot-starter-json`. Default agora é **Jackson 3** (`tools.jackson.databind.ObjectMapper`); Jackson 2 (`com.fasterxml`) existe mas **sem bean** — não autowire o de 2.x.
- **Testes:** `@AutoConfigureMockMvc` → `org.springframework.boot.webmvc.test.autoconfigure`. Em IT, extrair JSON com `com.jayway.jsonpath.JsonPath`, não `ObjectMapper`.
- **Testcontainers:** usar `TestcontainersConfiguration` gerada (`@ServiceConnection`) + `@Import(...)`. Classe `org.testcontainers.postgresql.PostgreSQLContainer`.
- **`*IT` exige `maven-failsafe-plugin` + `mvn verify`** (Surefire só roda `*Test`/`*Tests`). Já configurado no pom.
- `new DaoAuthenticationProvider(uds)` + `setPasswordEncoder(enc)`. Chaves RSA via `RsaKeyConverters.x509()/pkcs8()`.
- Scaffold via Spring Initializr (gera `mvnw` wrapper). Maven global não instalado — usar `./mvnw`.

> Admin seed: usuário `admin` / senha `Admin@123` (trocar em prod). Postgres dev: `docker compose up -d` em `backend/`.

## Documentação (docs/)
- `docs/modelo-de-dados.md` — ER (Mermaid) + dicionário das 20 entidades + RBAC/PBAC.
- `docs/diagramas-uml.md` — UML (Mermaid): casos de uso, classes, 3 sequências, componentes.
- `docs/superpowers/specs/2026-05-31-harmonia-mvp-design.md` — spec do MVP (API, segurança, gamificação).
- `docs/superpowers/plans/2026-05-31-backend-foundation-security.md` — **Plano 1** (auth/RBAC/JWT).
- `docs/superpowers/plans/2026-05-31-backend-domain-endpoints.md` — **Plano 2** (domínio + `/me` + `/professor`).
- `docs/superpowers/plans/2026-05-31-mobile-expo.md` — **Plano 3** (app Expo).
- `docs/superpowers/plans/2026-05-31-web-client.md` — **Plano 4** (web: Aluno+Professor+Admin, pós-MVP).
- `docs/ci.md` — pipelines de CI (build → unitário → integração → sistema) e convenção de nomes de teste.

## Próximos passos
1. ✅ Requisitos · 2. ✅ MVP · 3. ✅ Modelo de dados · 4. ✅ Spec · 5. ✅ Planos (4) ·
6. ✅ **Plano 1 executado** (auth/RBAC/JWT — na `main`, 22 testes verdes c/ Plano 2) ·
7. ✅ **Plano 2 executado** (domínio + `/me` + `/professor` + gamificação) ·
8. ✅ **Plano 3 executado** (mobile Expo — branch `feat/mobile-expo`; tsc clean, jest verde; falta smoke test E2E c/ backend no ar) ·
9. ✅ **Plano 4 executado** (escopo **só Admin Configurador** — mobile já cobre Aluno/Professor; Tasks 5-6 de paridade puladas por decisão). Backend `/admin/security/*` (Task 1, 3 IT) + web Vite/React. tsc/vitest/build verdes; falta smoke E2E. ·
10. 🔶 Entrega TCC: ✅ diagramas UML (`docs/diagramas-uml.md`) · ⏭️ Figma Admin · ⏭️ smoke E2E.
11. ✅ **Backend virou multi-módulo Maven** — extraído `lesson-core` (regras de agendamento/presença/reposição, Java puro, sem Spring/JPA) como módulo "framework" separado de `harmonia-app`; gamificação desacoplada via domain event (`AttendanceRecordedEvent`).
12. ✅ **`lesson-core` virou framework de agendamento de fato** — `TimeRange` (intervalo válido, fim exclusivo), `LessonSlot`/`WeeklyScheduleSlot` (entradas imutáveis), `SchedulingPolicy` (impede professor/aluno duplo-agendados; aula `CANCELED` libera o horário), `LessonLifecyclePolicy` (`SCHEDULED -> DONE | CANCELED`, terminais), `AttendanceRecordingRule` idempotente por transição (corrige XP nos dois sentidos). Adapter `LessonSchedulingGuard` (`application/lesson`) traduz entidade JPA → slot do core. Novo endpoint `PATCH /teacher/lessons/{id}/status` (`lesson.manage`). Erros: `ScheduleConflictException` → 409 `SCHEDULE_CONFLICT`, `DomainValidationException` → 422 `DOMAIN_VALIDATION`. `end_time` agora obrigatório (migration `V10`, com backfill de 1h clampado). Ver `backend/lesson-core/README.md`.

> Build/test backend: `cd backend && docker compose up -d && ./mvnw verify` (reactor builda `lesson-core` → `harmonia-app`; 31 unit no core, 14 unit + 32 IT no app, + 2 ST no perfil `system-tests`). Rodar app: `./mvnw -pl harmonia-app -am spring-boot:run`. Admin: `admin`/`Admin@123`.
> Pós-MVP backend: Setting (RF29 `/admin/settings`), Schedule (RF17/25 `/teacher/schedules`), MakeupLesson (RF26 `/teacher/lessons/{id}/makeup`), FinancialTransaction (RF27 `/admin/finance`). Mobile: upload de material (RF16) via `postForm`.
> Mobile: `cd mobile && npm start` (Expo SDK 56, router em `src/app`). Test/typecheck: `npx jest && npx tsc --noEmit`.
> Categorias de teste: `*Test`=unitário (Surefire) · `*IT`=integração (Failsafe) · `*ST`=sistema (Failsafe, perfil `system-tests`). Mobile: jest projects `unit`/`integration` (`src/app/**` = integração). Web: `*.integration.test.tsx` = integração (config própria). Detalhes em `docs/ci.md`.
> Chaves JWT são gitignored: rodar `backend/scripts/generate-jwt-keys.sh` em clone novo (CI faz isso sozinho).
> Android emul: `EXPO_PUBLIC_API_URL=http://10.0.2.2:8080`.
> Web: `cd web && npm run dev` (Vite 8, admin-only). Test/build: `npm test && npm run build`. `VITE_API_BASE_URL` no `.env`.
