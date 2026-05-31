# Spec — Harmonia MVP (Aluno + Professor)

**Data:** 2026-05-31
**Escopo:** MVP = perfis Aluno e Professor + fundação de segurança completa (RBAC+PBAC).
**Fora do MVP:** Web (`web/` — paridade Aluno+Professor + Configurador Admin), financeiro, matrículas/turmas via UI, relatórios admin. (Web = Plano 4.)
**Refs:** `CLAUDE.md` · `docs/modelo-de-dados.md` · Figma `Knfsw9IIzliM6o9KgLbRhG`.

---

## 1. Objetivo

App mobile de gestão de aulas de música. MVP entrega o ciclo pedagógico completo:
professor registra aulas/frequência/materiais; aluno acompanha aulas, registra prática e
evolui via gamificação (XP, nível, sequência, metas). Segurança RBAC+PBAC construída desde
o início (fundação para o Configurador Admin pós-MVP).

## 2. Arquitetura

**Monorepo.** Backend Clean Architecture; mobile em camadas por feature.

```
backend/        Spring Boot 4 · Java 25 · Postgres · Flyway
  domain/         modelos puros + regras (XP, frequência, ownership). Sem Spring/JPA.
  application/    use cases + portas (interfaces).
  infrastructure/ JPA entities + adapters, JWT, storage, security.
  presentation/   controllers REST + DTOs + mappers.
mobile/         Expo · React Native · Expo Router · NativeWind
  features/<x>/   components, hooks, services por domínio.
  lib/http/       cliente JWT (access+refresh).
docs/
```

Dependências apontam pra dentro. Regras de negócio (RN01-13) no `domain`. Detalhe em `CLAUDE.md`.

## 3. Segurança (fundação — construída inteira no MVP)

Modelo espelhado do marreh (ver `docs/modelo-de-dados.md`):

- **Usuario —n:n— Role —n:n— Permission.** `UserDetails` com authorities `ROLE_<name>` + permissões.
- **JWT RSA** (access ~15 min) + **Refresh Token** (longo, `token_hash` SHA-256, `revoked_at`). Stateless. BCrypt.
- **Autorização 2 camadas:** `@PreAuthorize` (PBAC `dominio.acao`) + filtro de **ownership** no use case (RN11/RN12). ADMIN bypassa (RN13).
- Seed (Flyway): roles ALUNO/PROFESSOR/ADMIN + catálogo de permissões + usuário admin inicial.

### Endpoints de auth
| Método | Rota | RF | Notas |
|---|---|---|---|
| POST | `/auth/login` | RF01 | `{login, senha}` → access+refresh+user |
| POST | `/auth/refresh` | — | rotaciona tokens |
| POST | `/auth/logout` | — | revoga refresh |
| GET | `/auth/me` | — | usuário atual (roles, permissões) |
| POST | `/auth/forgot-password` | RF02 | gera token, envia e-mail |
| POST | `/auth/reset-password` | RF02 | `{token, novaSenha}` |

## 4. API — Aluno (perfil ALUNO, ownership = self)

Prefixo `/me`. Todo dado filtrado pelo aluno autenticado (RN11).

| Método | Rota | RF |
|---|---|---|
| GET | `/me/dashboard` | RF03 — XP, nível, sequência, prática semanal, próxima aula |
| GET | `/me/aulas?status=proximas\|passadas` | RF04 |
| GET | `/me/aulas/{id}` | RF05 — detalhes + anexos |
| GET | `/me/materiais?busca=` | RF06 |
| GET | `/me/materiais/{id}/download` | RF06 |
| POST | `/me/praticas` | RF07 — registra prática → atualiza XP/progresso |
| GET | `/me/progresso` | RF08 |
| GET | `/me/metas?status=ativa\|concluida` | RF09 |
| POST | `/me/metas` · PUT `/me/metas/{id}` | RF09 |

## 5. API — Professor (perfil PROFESSOR, ownership = alunos vinculados)

Prefixo `/professor`. Filtro por `matricula.professor_id` = professor autenticado (RN12).

| Método | Rota | RF |
|---|---|---|
| GET | `/professor/dashboard` | RF10 — aulas hoje, alunos, freq média, próximas |
| GET | `/professor/alunos` | RF11 — vinculados |
| GET | `/professor/alunos/{id}` | RF12 — frequência, XP, metas, prática, obs |
| POST | `/professor/aulas` | RF13 — conteúdo, tarefa, exercícios |
| GET | `/professor/aulas?alunoId=&inicio=&fim=` | RF15 — histórico |
| PUT | `/professor/aulas/{id}` | RF13 |
| POST | `/professor/aulas/{id}/anexos` | RF13 — upload (RNF08) |
| POST | `/professor/aulas/{id}/frequencia` | RF14 — presença/falta/justificada |
| POST | `/professor/alunos/{id}/materiais` | RF16 — anexa material ao aluno |
| GET | `/professor/agenda?inicio=&fim=` | RF17 — calendário |
| GET | `/professor/relatorios?alunoId=&tipo=` | RF18 — freq/prática/evolução |

## 6. API — Suporte (mínimo, sem UI no MVP — guard ADMIN)

Para popular dados de demo (matrículas, instrumentos) enquanto o Configurador Admin não existe.
Testável via Postman/seed. Permissões `*.manage`.

| Método | Rota |
|---|---|
| CRUD | `/admin/instrumentos`, `/admin/turmas`, `/admin/matriculas`, `/admin/usuarios` |

## 7. Gamificação — fórmula proposta (RN07) — **validar**

| Regra | Proposta |
|---|---|
| XP por prática | `1 XP / minuto`, teto `120 XP/dia` de prática |
| XP por presença | `+20 XP` por aula `PRESENTE` |
| Nível | `nivel = floor(sqrt(xp_total / 100)) + 1` (curva suave; nv2=100xp, nv3=400, nv4=900) |
| Sequência (streak) | dias **consecutivos** com ≥1 prática; zera se passar 1 dia sem registro |
| Prática semanal | soma de `duracao_min` na semana corrente (seg–dom) |
| Meta concluída | quando `progresso_atual >= alvo` → status CONCLUIDA, `concluida_em` setado |

Cálculo no `domain` (serviço de gamificação puro, testável sem Spring). `Progresso` é cache
atualizado a cada `POST /me/praticas` e a cada registro de frequência.

## 8. Storage de arquivos (RNF08)

Porta `ArquivoStoragePort` no domínio. Adapters: `LocalStorageAdapter` (dev, filesystem) /
`S3StorageAdapter` (prod). Anexos de aula e materiais guardam `storage_path` + metadados; binário no storage.

## 9. Mobile (Expo) — telas do MVP

Seguem o Figma (node-ids no `CLAUDE.md`).

- **Comum:** Login, Esqueci a senha.
- **Aluno:** Dashboard (XP/nível/streak/prática/próx. aula), Minhas Aulas (próximas/passadas),
  Detalhes da Aula (+anexos), Materiais (lista/busca/download), Registrar Prática, Progresso, Metas (ativas/concluídas), Mais/Menu.
- **Professor:** Dashboard, Alunos (lista/detalhes), Nova Aula (conteúdo/tarefa/anexos),
  Registrar Frequência, Histórico de Aulas, Materiais (anexar ao aluno), Agenda/Calendário, Relatórios, Mais/Menu.

`lib/http` central: injeta access token, refresh automático antes de expirar, logout em 401 (padrão marreh-intranet). Roteamento por papel após login (ALUNO → stack aluno; PROFESSOR → stack professor).

## 10. Erros & validação

- Validação Jakarta nas bordas (DTO). Erros de domínio → exceções tipadas → `@RestControllerAdvice` → resposta padrão `{timestamp, status, code, message, fields[]}`.
- 401 sem/expirado token · 403 sem permissão/ownership · 404 recurso · 409 conflito (ex. e-mail duplicado) · 422 validação.

## 11. Testes

- **Domínio + use cases:** unit puro (JUnit), foco em XP/streak/frequência/ownership. Sem Spring.
- **Infra:** testes de integração de repositório (Testcontainers Postgres) e segurança (`@SpringBootTest` + MockMvc) nos fluxos de auth/autorização.
- **Mobile:** testes de componente/hook chave (auth, http) — leve, suficiente p/ TCC.

## 12. Sequência de build (resumo — detalhar no plano)

1. Scaffold backend (Clean Arch, Postgres, Flyway, deps).
2. Segurança completa (Usuario/Role/Permission/RefreshToken, JWT RSA, login/refresh/me, seed). `V1`.
3. Cadastros núcleo: Instrumento, Aluno, Professor, Turma, Matricula + endpoints `/admin/*` mínimos. `V2`.
4. Aulas + Frequencia + AnexoAula + Materiais + storage. `V3`.
5. Gamificação: Pratica, Progresso, Meta + engine de XP. `V4`.
6. Endpoints Aluno (`/me/*`).
7. Endpoints Professor (`/professor/*`) + relatórios/agenda.
8. Scaffold mobile (Expo, Router, NativeWind, `lib/http` JWT).
9. Auth mobile (login, esqueci senha, roteamento por papel).
10. Telas Aluno (Figma).
11. Telas Professor (Figma).
12. Integração E2E + polish.

## 13. Decisões adotadas
UUID em entidades sensíveis · soft delete (RNF05) · aula criada manual pelo professor (Horario = referência) · segurança RBAC+PBAC completa no MVP · admin via painel web pós-MVP · **build Maven** · **fórmula de gamificação da seção 7 aprovada** (ajustável via `Configuracao` chave-valor).

## 14. Em aberto
- Envio de e-mail (RF02) — provider (SMTP/SES). Mock em dev; decidir no passo de auth.
