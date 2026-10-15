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

## Telas do professor (Figma 21–30, `prof.figma`)

Revisão Codex em 31 achados. Gate 1:

| ID | Tela | Decisão | Motivo |
|---|---|---|---|
| T-001–005 | 21 dashboard | ACEITO | Margem ~28, métricas planas com ícone na ação, próximas aulas em colunas hora/nome/instrumento, "Ver agenda completa" à direita |
| T-006–007 | 22 alunos | ACEITO | Margem do Figma e avatar de 60px |
| T-008 | 23–27, 26 | ACEITO (dono) | Tab bar também no Stack do professor (`teacher-tabs.ts`, `dismissTo`) |
| T-009–010 | 23/24/27 | ACEITO | Cabeçalho só com voltar, avatar 80px; seções em abas de texto sublinhadas |
| T-011 | 23/24/27 | REJEITADO | Navegação por setas do teclado no web (mobile-first) |
| T-012–015 | 23/24 | ACEITO | Métricas planas; campos de informação contornados; um card por aula; "Nova aula" no rodapé |
| T-016 | 23–27 | ADIADO | Carregamento por seção (6 requisições); otimização sem efeito visual |
| T-017 | 25 prática | PARCIAL | Lista mantida; tocar abre a nova tela de detalhe da prática (`practice/[id]`) com os campos do Figma. Dificuldade/humor saem das notas livres (`practiceNotes.ts`) |
| T-018–020 | 27 frequência | ACEITO | Calendário retangular, legenda vertical, resumo do mês contornado |
| T-021–023 | 26 nova aula | ACEITO | Aluno → Data → Conteúdo → Tarefa; agenda numa seção "Agendamento"; foco no 1º campo inválido |
| T-024–025 | 22/28/29 | ACEITO | Busca "…"; Agenda com calendário do mês (`MonthCalendar`) |
| T-026 | 28 agenda | PARCIAL | Linha compacta hora/nome, mas a chamada de presença continua visível (função do app) |
| T-027 | 22/28/29 | REJEITADO | Banner de erro sobre listas (mesma decisão do `use-resource` no aluno) |
| T-028 | 29 relatórios | PARCIAL | Menu com as 4 categorias; só "Evolução por aluno" tem dados — as outras 3 aparecem "Em breve" |
| T-029 | 30 mais | REJEITADO → adição | "Ver perfil" exige tela de perfil (backend) |
| T-030–031 | 30, 23 | ACEITO | Lista de "Mais" sem blocos; números com `Intl` pt-BR |

O Figma de "Mais" do professor mostra por engano a tab bar do aluno; mantida a do professor.

| Lote | Escopo | Status |
|---|---|---|
| T1 | abas do professor (dashboard, alunos, agenda, relatórios, mais) | ✅ gates 1-3 ok — Gate 3 pegou setas do calendário em cor diferente da frequência; `WeekStrip` sem uso removido |
| T2 | telas internas (detalhe do aluno, prática, nova aula, frequência) + tab bar no Stack | ✅ gates 1-3 ok (tsc, 231 testes) — Gate 3 pegou rodapé das métricas quebrando linha ("Últimos 30 dias") e notas cruas ("Dificuldade: …; Avaliação: 5/5") na lista de práticas |
| — | anel de foco preto no web (pedido do dono) | ✅ `outline: none` medido no textarea focado; borda roxa do campo indica o foco (`31-foco-textarea.png`) |

Conhecido, fora do escopo: no web, abrir `/dashboard` ou `/more` digitando a URL resolve primeiro a rota do aluno (mesmo caminho nos dois grupos) → um 403 de `/me/dashboard` no console antes do redirecionamento. A navegação dentro do app usa rotas com grupo e não é afetada.

## Adições 1 e 5 (2026-10-14)

Plano do architect: `docs/superpowers/plans/2026-10-14-teacher-student-management.md`. Decisões do dono: duas notas por professor↔aluno (privada + compartilhada que o aluno lê); sem troca de senha obrigatória; professor não altera e-mail; admin ler as notas fica para o futuro.

| Fase | Escopo | Verificação |
|---|---|---|
| A | backend cadastro/edição + notas | `verify` 142 testes; alerta de segurança (usuário igual ao e-mail de outra conta → login ambíguo) corrigido com checagem cruzada + IT |
| B | backend `difficulty`/`rating` + backfill V15 | `verify` 149 testes; backfill conferido nos dados reais |
| C | mobile prática | 236 testes; capturas do detalhe/lista/histórico |
| D | mobile formulário + notas do aluno | 288 testes; fluxo Playwright real (cadastrar → Resumo → editar → aluno entra com a senha inicial e lê a observação), sem erro HTTP. Gate 3 pegou e-mail/usuário somente leitura com aparência de editável → fundo cinza + "Só a administração pode alterar." (`40`–`45`) |

Dados de teste criados no banco dev pelo fluxo: alunos `aluno.<n>` ("Aluno Teste …") vinculados a `prof.figma`.

## Adição 1 — anexos e edição de aula (2026-10-15)

Plano: `docs/superpowers/plans/2026-10-14-lesson-attachments-editing.md`. Decisões do dono: Drive com conta Google dedicada (OAuth) para início/validação; tipos PDF/imagem/áudio/vídeo; aula concluída edita conteúdo/tarefa/anexos com data travada.

| Fase | Escopo | Verificação |
|---|---|---|
| B1–B2 | regras de edição no lesson-core, `GET/PUT /teacher/lessons/{id}` | `verify` verde; IT pegou JSON path errado no próprio teste (`referenceId`) |
| B3–B4 | anexos (regra, V16, endpoints) | `verify` verde; 10 IT + 25 unit + 22 regra |
| B5 | storage trocável local/Google Drive | `verify` verde; adaptador testado com respostas simuladas (sem token) |
| M1–M5 | formulário com anexos, tela de editar aula, download do aluno | 304 testes jest; fluxo Playwright real (criar com 2 anexos → agenda "Editar" → salvar → aluno baixa bytes idênticos), sem erro HTTP. Gate 3 pegou linhas de anexo como botão roxo centralizado → linha do Figma 26 (ícone, nome, tamanho à direita) (`50`–`53`) |

Codex sem cota (B5) e depois com sandbox do Windows quebrado (`setup refresh had errors`) — B5 e M1–M5 implementados pelo Claude. Arquivo novo colidiu com `lessonForm.ts`/`lessonAttachments.ts` em FS case-insensitive → `LessonFormScreen.tsx`/`LessonAttachmentList.tsx`.

Conhecido: no web, `/lesson/<id>` digitado resolve a rota do aluno (mesmo caminho nos dois grupos), como `/dashboard`. Dados de teste no banco dev: duas aulas de João Silva em 15 e 16/03/2027 com `partitura.pdf` e `postura.png`.

## Pendências para decisão do dono

Adições do Figma do professor que exigem backend: anexos e edição de aula; os 3 relatórios agregados; perfil, turmas, financeiro, configurações e notificações.
