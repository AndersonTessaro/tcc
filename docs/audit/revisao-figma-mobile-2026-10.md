# Revisão das telas do aluno — Figma + Web Interface Guidelines (2026-10)

Referências: `docs/audit/figma/` (protótipo) · capturas antes/depois: `docs/audit/app-before/`, `docs/audit/app-after/` (402×874, Expo web, aluno `joao.figma`).
Fidelidade combinada: **linguagem visual e layout** do Figma; funcionalidades do app que o protótipo não tem são mantidas.

Fluxo por lote: Codex revisa (read-only) → **Gate 1** verificação de cada achado contra captura/código → Codex corrige só os aceitos → **Gate 2** revisão do diff + `tsc`/`jest` → **Gate 3** nova captura comparada ao Figma → commit.

## Gate 1 — decisões

| ID | Tela | Decisão | Motivo |
|---|---|---|---|
| F-001 | fundação | ACEITO | Cards com borda fina e sem sombra nas telas 03–10 do Figma |
| F-002 | fundação | ACEITO | Trilha de progresso cinza (`#CACACA`) e fundo `#F4F4F4` |
| F-003 | fundação | ACEITO | CTA primário roxo escuro (`#3A1D77`); roxo claro fica nos indicadores |
| F-004 | fundação | ACEITO | Margem lateral ~28–30 nas telas do aluno |
| F-005 | fundação | ACEITO | Seta completa no voltar; cabeçalho mais espaçado |
| F-006 | fundação | ACEITO | Campos brancos, borda 1 |
| F-007 | fundação | ACEITO parcial | Indicador da aba na largura da aba; label ativo continua destacado (estado não só por barra) |
| F-008 | 04/07/09 | ACEITO (dono) | Tab bar também nas telas do Stack; troca de aba via `dismissTo` passa pela guarda de alterações |
| F-009 | fundação | REJEITADO | `href`/links reais: app mobile-first (decisão anterior) |
| F-010 | fundação | REJEITADO | Formatadores pt-BR fixos atendem; "1 h 30 min" diverge do Figma |
| F-011 | fundação | ACEITO | Safe area inferior em telas sem tab bar |
| F-012 | fundação | ACEITO | `aria-invalid` + erro associado no TextField |
| F-013 | fundação | REJEITADO | Hover: mobile-first |
| F-014–016 | 01 login | ACEITO | Painel começa ~y328, logo maior, espaçamento do Figma, "Esqueci" à direita, erro por campo |
| F-017 | 02 dashboard | ACEITO (BUG) | Topo do card de XP cortado pela margem negativa |
| F-018–019 | 02 dashboard | ACEITO | XP centralizado; cards empilhados; CTA "Registrar prática" mantido (adição do app) |
| F-020 | 03 aulas | ACEITO | Instrumento em negrito; ícone de status à direita |
| F-021 | 04 detalhe | ACEITO | Ordem data/hora → instrumento → professor |
| F-022–023 | 05 prática | ACEITO | CTA no rodapé; barras estreitas roxo escuro; + card "Minha última prática" (dados existentes) |
| F-024–028 | 07 registrar | ACEITO | Campos Data/Tempo visíveis (chips viram atalhos); Salvar após avaliação; foco no 1º inválido; `beforeunload` no web; "…" |
| F-029–032 | 08 progresso | ACEITO | Ordem Tempo → Frequência → XP; títulos escuros; cores do gráfico; CTA de metas preenchido |
| F-033 | 09/10 metas | ACEITO | Abas de meia largura com sublinhado; "Nova meta" no cabeçalho |
| F-034 | 09/10 metas | REJEITADO | Estado na URL: mobile-first |
| F-035–036 | 11 mais | ACEITO | Lista sem blocos, com divisórias; ícones coerentes |
| F-037 | 12 materiais | ACEITO | "Buscar material…" |
| F-038 | 12 materiais | REJEITADO | Busca na URL: mobile-first |
| F-040 | backend prática | ACEITO (BUG) | `POST /me/practices` devolvia a entidade JPA `Progress`; agora `ProgressResponse` |
| F-039 | backend metas | ACEITO (BUG) | `GET /me/goals` devolve entidade JPA (aluno → usuário → papéis/permissões); trocar por DTO |
| ADD-06 | práticas | ACEITO (dono) | Tela `practice/history` com todas as práticas + link "Ver histórico" |
| ADD-07 | registrar | ACEITO (dono) — implementado no B5 | Plano do architect: `docs/superpowers/plans/2026-10-12-practice-recording.md` |

## Lotes

| Lote | Escopo | Status | Commit |
|---|---|---|---|
| B0 | fundação (`theme.ts`, `src/ui/*`, tab bar) | ✅ gates 1-3 ok (tsc, 149 testes, captura) | ver git log |
| B1 | login | ✅ gates 1-3 ok — Gate 3 pegou "Esqueci minha senha" ainda à esquerda (`Link asChild` descarta estilo-função no web) → corrigido com wrapper | `9d111c1` |
| B2 | abas do aluno | ✅ gates 1-3 ok — Gate 3 pegou F-017 não resolvido (margem negativa só mudou de lugar) → gradiente movido para dentro do scroll | `dd08bdc` |
| B3 | telas do Stack do aluno + F-039 | ✅ gates 1-3 ok — `StudentFlowIT` verde; Gate 3 pegou data ISO crua no web → `<input type="date">` nativo (vale p/ 5 telas) | ver git log |

| B4 | tab bar no Stack, histórico completo, `ProgressResponse` | ✅ gates 1-3 ok — `StudentFlowIT` verde; 173 testes | ver git log |
| B5 | anexo de prática (áudio/vídeo até 50 MB) — plano do architect | ✅ `verify` completo (41 + 35 unit, 57 IT); 211 testes mobile; captura do bloco de anexo. Gate do Claude: teto de 1000 no histórico (alerta de segurança) e nome de arquivo nulo/longo | ver git log |

## Smoke manual do anexo (2026-10-12, backend reiniciado com V12)

API (`joao.figma` / `prof.figma`): 10/10 — registro devolve `practiceId`; upload 40 MB → 200 e XP inalterado; listagem e download do aluno idênticos; 60 MB → 413 `FILE_TOO_LARGE`; `malware.mp4` com bytes "MZ" e `aula.exe` declarado `video/mp4` → 422; professor vinculado lista e baixa os mesmos bytes.
Tela web: escolher arquivo → "Prática.mp4 · 2,0 MB" com Trocar/Remover → salvar → recompensa (+30 XP) → gravação aparece no histórico; sem erros no console. Gate 3 pegou a linha de download centralizada no card → alinhada à esquerda.

## Métricas do Codex (este ciclo)

- Revisão: 38 achados → 30 aceitos, 6 rejeitados (16%), 2 adiados + 1 achado novo da verificação manual (F-039).
- Implementação: 3 regressões/omissões pegas só na captura (Gate 3): F-017, F-015 (alinhamento), data ISO no web. `tsc`/`jest` passavam nos três casos — a verificação visual é indispensável.

## Pendências para decisão do dono

- Telas do professor: aguardam as imagens do protótipo (MCP do Figma no limite do plano Starter).
