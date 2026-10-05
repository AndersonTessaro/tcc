# Revisão do app e do lesson-core — 03/10/2026

O app foi revisado por tela, cruzando as ações disponíveis com os controllers do backend e as regras do `lesson-core`. Os dados continuam vindo da API. As referências visuais salvas foram mantidas; novas consultas ao Figma estão bloqueadas pelo limite do plano, e não havia navegador ou emulador disponível para conferir o resultado visual nesta sessão.

## Telas

| Tela | Recursos conferidos | Evidência e ajuste |
| --- | --- | --- |
| Login | Credenciais, perfil, nome, sessão salva, expiração e saída | Testes de sessão e login. O perfil administrativo recebe orientação para usar o portal. |
| Recuperar senha | Validação de e-mail, solicitação, erro e confirmação | Testes da tela e do backend. A confirmação permite abrir a redefinição. |
| Redefinir senha | Token, confirmação, senha mínima, token expirado e sucesso | Nova tela ligada a `POST /auth/reset-password`, com teste de formulário e backend. |
| Painel do aluno | XP, nível, sequência, prática semanal e próxima aula | Renderizado com API real. Removida a meta fixa de 8h; próxima aula abre seus detalhes. O backend filtra canceladas/finalizadas e ordena por data e hora. |
| Minhas aulas | Aulas passadas e futuras, status e detalhes | Testes da lista e endpoints reais da coleção. |
| Detalhes da aula | Data, início/fim, professor, instrumento, status, conteúdo, tarefa e metadados dos anexos | Renderizado com aula criada pela tela e API real. Anexos de aula ainda não têm upload/download no backend. |
| Materiais do aluno | Lista, busca, descrição, arquivo, professor, data e download autenticado | Upload real e download dos mesmos bytes pela tela. Arquivo é entregue ao navegador ou compartilhamento nativo. |
| Práticas em casa | Último registro, frequência semanal, músicas extraídas das notas e registros recentes | Registro real reaparece na tela. Adicionado histórico com data, duração e notas. |
| Registrar prática | Data, duração, descrição, dificuldade e avaliação | Tela enviou registro real; conferidos XP e histórico. Proteção contra envio duplicado. Anexo de prática está identificado como indisponível. |
| Meu progresso | Prática, frequência, XP, nível e acesso às metas | Renderizado com valores reais após prática; testes do gráfico. Corrigidos os nomes dos eixos. |
| Minhas metas | Ativas/concluídas, descrição, tipo, objetivo e progresso | Criação e conclusão realizadas pela tela contra a API. Adicionados formulário e atualização por `PUT /me/goals/{id}?progress=...`. |
| Mais do aluno | Identidade, acesso a materiais/metas/aulas e saída | Revisão das rotas e sessão. Materiais e metas agora têm entradas diretas. Configurações/notificações pessoais não têm API. |
| Painel do professor | Turmas, alunos, aulas de hoje, frequência, prática e próximas aulas | Renderizado com API real; próxima aula mostra a data e abre o dia correspondente. Proteção contra respostas de uma turma anterior. |
| Alunos | Alunos vinculados, busca e acesso ao detalhe | Renderizado com lista real. Cadastros administrativos continuam no portal. |
| Detalhes do aluno | Resumo, aulas, frequência por mês, prática e materiais | Renderizado com prática real; calendário e resumo mensal testados. Aula abre a agenda na sua data. Upload preserva o arquivo selecionado no web e permite descrição. |
| Nova aula | Matrícula, data, início/fim, conteúdo, tarefa, status inicial e conflitos | Aula futura criada pela tela e exibida ao aluno. Conflitos e estados testados no frontend e na coleção. |
| Agenda | Consulta por dia, conteúdo/tarefa, frequência, correção, conclusão, cancelamento e reposição | Tela cancelou uma aula real e corrigiu frequência. XP conferido antes/depois, incluindo repetição idempotente e reversão. |
| Horários fixos | Matrícula, dia, início/fim, criação, ativação/desativação e conflitos | Lista real renderizada; mutações e conflitos cobertos nos testes das telas e coleção. Atualização ao focar, carregamento e tentativa novamente. |
| Reposição | Aula original, nova data/horário, motivo, conflito e vínculo único | Tela criou reposição real. Nova consulta `GET /teacher/lessons/{id}/makeup` mostra a reposição existente, bloqueia outro envio e abre sua data na agenda. |
| Histórico | Período, aluno, instrumento, horário e status | Lista real renderizada; filtros testados. Cada registro agora abre seu dia na agenda. |
| Relatórios | Seleção de aluno, frequência, prática, XP, nível, aulas, metas e detalhe | Renderizado com XP atualizado por uma prática real e testes de erro/tentativa novamente. |
| Mais do professor | Identidade, alunos, horários, histórico e saída | Revisão de rotas e sessão. |

## Regras do framework

| Regra | Onde aparece no app | Verificação |
| --- | --- | --- |
| Intervalo válido, com fim exclusivo | Nova aula, horários fixos e reposição | Validação do formulário, testes do core e HTTP. Aulas adjacentes são aceitas. |
| Conflito por professor/aluno, inclusive horários semanais | Mesmos formulários | Conflito retorna mensagem traduzida. Coleção testa sobreposição, adjacência e desativação de horários. |
| Status inicial e transições finais | Nova aula, agenda, histórico e detalhe | Aula de hoje/passada nasce realizada; futura nasce agendada. Ações de reabrir uma finalizada não são oferecidas. |
| Frequência somente a partir do dia da aula e sem canceladas | Agenda e relatórios/progresso | Botões condicionais; erros do servidor traduzidos; testes de tela e backend. |
| Presença concede XP uma vez; correção pode revogar | Agenda, painéis, progresso e detalhe/relatório do aluno | Teste real de falta → presença → presença repetida → falta compara o XP em cada etapa. |
| Reposição somente de aula realizada/cancelada, uma por original | Agenda e reposição | Fluxo real completo e consulta do vínculo; testes de duplicidade e autorização. |
| Locks, transações e eventos idempotentes | Aplicados no backend, sem controles de UI | Testes do core, integração do adaptador e coleção HTTP. |

## Validação

- `npx tsc --noEmit`.
- `npm test -- --runInBand`: 16 suítes, 60 testes.
- `npm run test:live`: 7 testes com componentes renderizados, serviços reais, API na porta 18080 e PostgreSQL isolado na porta 15433. Router, armazenamento de token e entrega final do arquivo são adaptados ao ambiente de teste; não substituem teste em aparelho.
- `npx expo export --platform web`: 45 rotas exportadas.
- `git diff --check`.
- `backend/.\mvnw.cmd -pl harmonia-app -am verify`: 41 testes do core, 15 unitários da aplicação e 48 de integração; cobertura exigida pelo Maven aprovada.
- Newman contra a API recompilada: 62 requisições e 86 verificações, sem falhas.

Os relatórios de execução ficam em `backend/harmonia-app/target/mobile-framework-newman.json` e `mobile-live.log`. O JSON de Newman contém credenciais/tokens apenas do banco descartável e não deve ser versionado.

## Reexecutar os testes com API real

Os testes fazem escritas. Use somente banco descartável, nunca produção. Na raiz do repositório:

```powershell
docker run --detach --name harmonia-mobile-framework-audit -e POSTGRES_DB=harmonia -e POSTGRES_USER=harmonia -e POSTGRES_PASSWORD=harmonia -p 15433:5432 postgres:16
```

Se esse container já existir, use `docker start harmonia-mobile-framework-audit`. O container desta revisão foi parado ao final, assim como a API temporária; o banco normal da máquina não foi alterado.

Em `backend`, compile e inicie a API. Encerre o processo anterior antes de recompilar o JAR no Windows.

```powershell
.\mvnw.cmd -pl harmonia-app -am package -DskipTests
java -jar harmonia-app/target/harmonia-app-0.0.1-SNAPSHOT.jar --server.port=18080 --spring.datasource.url=jdbc:postgresql://localhost:15433/harmonia --spring.docker.compose.enabled=false --app.storage.local-dir=harmonia-app/target/mobile-audit-storage
```

Em outro terminal, na raiz, prepare os perfis e dados:

```powershell
npx --yes newman@6 run postman/Harmonia-lesson-core.postman_collection.json --env-var baseUrl=http://localhost:18080 --reporters json --reporter-json-export backend/harmonia-app/target/mobile-framework-newman.json
```

Depois, em `mobile`, rode `npm run test:live`. Os testes leem as credenciais descartáveis do relatório de Newman, autenticam novamente e usam os endpoints do app. O comando normal `npm test` continua independente de uma API rodando.

## Limites ainda existentes

- Conferência visual com as referências salvas e teste nativo em aparelho não ocorreram nesta sessão. É preciso verificar teclado, áreas seguras, seletor de arquivo e compartilhamento em Android/iOS.
- Anexos de prática, operações de anexos vinculados a uma aula, notificações, configurações pessoais e observações do aluno não possuem endpoints completos. O app não oferece envio de anexo de prática como se fosse funcional; anexos de aula são apenas metadados.
- A implementação de e-mail existente é `LogEmailSender`. A recuperação/redefinição funciona com o token, mas a entrega de e-mail real depende de um provedor de envio.
- Cadastro/edição de alunos, matrículas e demais funções administrativas pertencem ao portal web; o app mantém os perfis de aluno/professor.
- As novas dependências nativas de arquivos/compartilhamento seguem o SDK 56. Uma instalação antiga do development build deve ser recompilada. APIs conferidas na documentação oficial de [FileSystem](https://docs.expo.dev/versions/v56.0.0/sdk/filesystem/) e [Sharing](https://docs.expo.dev/versions/v56.0.0/sdk/sharing/).

Esta revisão não inclui publicação nem deploy.
