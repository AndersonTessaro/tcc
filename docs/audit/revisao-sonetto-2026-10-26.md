# Pente fino — ajustes Sonetto (26/10/2026)

Plano: `docs/superpowers/plans/2026-10-26-ajustes-sonetto.md`. Commits: `616e66e` (backend), `083de06` (mobile), `53baf7e` (web).

## Verificação automática
| Parte | Comando | Resultado |
|---|---|---|
| Backend | `./mvnw verify` | lesson-core 49 · app unit 199 · IT 161 · 0 falhas |
| Mobile | `npx tsc --noEmit && npx jest` | tsc limpo · 434/434 |
| Web | `npm test && npm run build` | 12 unit + 26 integração · build ok |

## E2E (Playwright, Expo web 412×860 + admin web, backend local)
Banco de dev existente (migrado de V21 para V23 sem erro). Capturas em `sonetto-e2e/`.

| # | Item do PDF | Verificado | Captura |
|---|---|---|---|
| 1 | Cabeçalho fixo | Professor e aluno, rolando a lista | 01, 09 |
| 2 | Presença fica marcada | "Presente" continua marcado após recarregar | 02 |
| 3 | Calendário no domingo | Agenda: Dom..Sáb, 01/10/2026 numa quinta | 10 |
| 4 | Anexo de aula em Materiais | Professor (aba Materiais) e aluno, selo "Aula 26/10", download ok | 04, 06 |
| 5 | Foto de perfil + perfil do aluno | Upload professor e aluno, nome do aluno salvo, foto na lista do professor; outro professor → 403, sem login → 401 | 03, 07, 11 |
| 6 | Menos botões repetidos | Cartões do dashboard só informativos | 01 |
| 7 | Próxima aula do aluno | "Hoje · 16:00" (aula das 08:00, já iniciada, ignorada) | 05 |
| 8 | Meta cumprida → Encerradas | Meta diária de 20 min + prática de 25 min → Encerradas, selo "Cumprida" | 08 |
| 9 | Login admin após usar o app | Login com token vencido salvo e depois de logar como professor no Expo (mesmo `localhost`) | — |
| 10 | Excluir usuário | Professor de teste com 2 matrículas e 8 aulas excluído; nenhuma matrícula órfã | — |

## Bugs achados e corrigidos
- **Meta encerrada somava prática feita depois do encerramento.** `GoalProgressCalculator` contava o período inteiro (`period.end`) em vez de parar no dia de referência; meta encerrada no dia 19 mostrava "1 h 30 min de 1 h". Agora conta até o dia de referência (hoje para meta ativa, data de encerramento para meta encerrada). Teste `endedGoal_ignoresPracticeAfterTheReferenceDay`.

## Observações (sem correção)
- **Cookie de refresh compartilhado em `localhost`.** Expo web e admin web na mesma máquina dividem o cookie `refresh_token` (cookie não separa porta). O login funciona; mas, se o token do admin vencer depois de alguém entrar como professor no Expo, a renovação devolve a sessão do professor e o admin volta para o login. Só em dev; em produção os hosts são diferentes. Contorno: abrir um dos dois por `127.0.0.1`.
- **Presença em aula de hoje ainda não iniciada** é aceita (a regra recusa só data futura). Mantido: o professor pode lançar no dia.
- Metas encerradas antes da V22 ficam com `completed=false` ("Encerrada"), mesmo que tenham batido o alvo.
- Avisos do console do Expo web (`shadow*`, `useNativeDriver`, `resizeMode`, `pointerEvents`) vêm de bibliotecas no web; nenhum erro.
- Dados de dev alterados no teste: senhas de `prof`, `aluno`, `user` e `prof.figma` = `Teste@123`; nome de `user` = "Aluno Teste"; usuário `prof1790115441672` excluído; 2 aulas de 26/10, 1 anexo e 1 meta criados.
