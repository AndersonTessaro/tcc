# CI — pipelines por categoria de teste

Gatilhos: **todo pull request para `main`** e **todo merge/push em `main`**.
Runs concorrentes no mesmo ref são cancelados (`concurrency`).

## Encadeamento

```
build ──▶ unit-tests ──▶ integration-tests ──▶ system-tests ──▶ ci-passed
```

Cada etapa é um workflow reutilizável próprio (`on: workflow_call`), ligado pelo
`needs:` no orquestrador. Etapa só começa se a anterior ficou verde — feedback
rápido primeiro (compilação, depois testes isolados), e o que é caro (Testcontainers,
app inteira de pé) só roda quando o barato já passou.

| Arquivo | Etapa | O que roda |
|---|---|---|
| `.github/workflows/ci.yml` | orquestrador | gatilhos, `needs`, job `ci-passed` |
| `.github/workflows/build.yml` | 1 — build | `mvnw install -DskipTests`; `npm ci` + `tsc --noEmit` (mobile) + `npm run build` (web) |
| `.github/workflows/tests-unit.yml` | 2 — unitário | `mvnw test`; `npm run test:unit` (mobile, web) |
| `.github/workflows/tests-integration.yml` | 3 — integração | `mvnw verify`; `npm run test:integration` (mobile, web) |
| `.github/workflows/tests-system.yml` | 4 — sistema | `mvnw -pl harmonia-app -am -Psystem-tests verify` |

`ci-passed` agrega tudo — é o único status a exigir na branch protection de `main`.

## O que é cada categoria

**Unitário** — sem I/O, sem framework, sem rede. Etapa não precisa de Docker: o
teste de carga de contexto virou `ApplicationContextIT` justamente para não pesar aqui.
- `lesson-core`: regras de agendamento/presença/reposição em Java puro (`*Test`).
- `harmonia-app`: use cases e serviços de domínio (`*Test`, Surefire).
- `mobile`: projeto jest `unit` — tudo fora de `src/app` (cliente HTTP, services).
- `web`: `vitest run` — suites de integração ficam de fora via `exclude`.

**Integração** — peças reais conversando entre si, só a borda externa é falsa.
- `harmonia-app`: `*IT` com contexto Spring + PostgreSQL real (Testcontainers), via
  Failsafe. Aqui também roda o portão de cobertura JaCoCo (75% de linha sobre
  unit+IT mesclados) — por isso a etapa chama `verify` completo, que reexecuta o
  Surefire: os dois `.exec` precisam existir no mesmo reactor run.
- `mobile`: projeto jest `integration` — telas de `src/app` renderizadas com seus
  services/roteador.
- `web`: `vitest.integration.config.ts` — `<App/>` inteiro (router + AuthProvider +
  apiClient + páginas) com só o `fetch` stubado.

**Sistema** — a aplicação montada, exercitada de fora.
- `harmonia-app`: `*ST` sobem a app num porta real (`RANDOM_PORT`) e falam HTTP de
  verdade (`java.net.http.HttpClient`) contra PostgreSQL real. Sem MockMvc, sem
  colaborador stubado. `AuthJourneyST` cobre login → `/auth/me` e a rejeição sem token.
- Mobile e web não têm etapa de sistema: E2E de app exigiria Detox/Playwright e
  emulador/browser no runner — fora do escopo do TCC. O smoke E2E manual continua
  sendo o previsto em `CLAUDE.md`.

## Convenções de nomenclatura

| Sufixo/caminho | Categoria | Executor |
|---|---|---|
| `*Test.java` | unitário | Surefire |
| `*IT.java` | integração | Failsafe (perfil padrão) |
| `*ST.java` | sistema | Failsafe (perfil `system-tests`) |
| `mobile/src/app/**/*.test.tsx` | integração | jest, projeto `integration` |
| demais `mobile/src/**/*.test.ts(x)` | unitário | jest, projeto `unit` |
| `web/src/**/*.integration.test.tsx` | integração | vitest (config própria) |
| demais `web/src/**/*.test.ts(x)` | unitário | vitest |

## Chaves RSA no CI

`app.rsa.*` aponta para `.pem` em `harmonia-app/src/main/resources/certs/`. Esse par
está **commitado** — decisão consciente de TCC para o deploy no Render subir sem
configuração; o repo é público, então trate a chave como descartável e rotacione
antes de qualquer uso real. Toda etapa que sobe contexto Spring ainda chama
`backend/scripts/generate-jwt-keys.sh`, que é idempotente: com o par no lugar, não
faz nada; sem ele (par removido, clone parcial), gera um.

## Rodando local

```bash
cd backend && docker compose up -d       # Postgres de dev (os testes usam Testcontainers)
./mvnw test                              # unitário
./mvnw verify                            # integração + portão de cobertura
./mvnw -pl harmonia-app -am -Psystem-tests verify   # sistema

cd ../mobile && npm run test:unit && npm run test:integration
cd ../web    && npm run test:unit && npm run test:integration
```
