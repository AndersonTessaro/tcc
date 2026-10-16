# Verificação do painel admin — 2026-10-16

Plano: [admin-panel-improvements](../superpowers/plans/2026-10-16-admin-panel-improvements.md).

O administrador agora consulta os cadastros nas páginas de Alunos, Professores,
Instrumentos e Matrículas, altera instrumentos do professor, status e mensalidade,
busca usuários por nome/usuário/e-mail e perfil, cria perfis e informa categoria e
data no financeiro. A URL antiga de Cadastros redireciona para Alunos.

| Comportamento | Teste | Resultado |
|---|---|---|
| Lista matrículas ordenadas e usa o filtro da porta; muda status, aceita repetição e impede reativação duplicada | `AdminEnrollmentsUseCaseTest` | 7 unitários passaram |
| Contrato HTTP, lista com/sem filtro, persistência do status, 404, 409, 403, 401 e status obrigatório | `AdminEnrollmentsIT` | 7 testes compilados, sem execução |
| Seletores de matrícula, instrumentos por professor, cadastro de aluno/professor/instrumento e recarga | `Registrations.integration.test.tsx` | 8 passaram |
| Filtro/busca, encerramento com confirmação, mensalidade inclusive zero/null, criação, erros e recarga após trocar filtro durante uma alteração pendente | `Enrollments.integration.test.tsx` | 7 passaram |
| Busca/perfil de usuário, criação de perfil, financeiro, permissões e configurações | `AdminManagement.integration.test.tsx` | 7 passaram |
| Login e redirecionamento da URL antiga | `loginFlow.integration.test.tsx` | 3 passaram |

As integrações web usam serviços simulados; o teste de login e redirecionamento usa
o aplicativo completo com a rede simulada. Isso não valida o navegador contra uma API real.

## Comandos e resultados

Executados em `web/`:

- `npm test`: exit 0; 10 unitários + 25 integrações, sem falhas.
- `npm run build`: exit 0.
- `npx eslint src/App.tsx src/components/layout/AppLayout.tsx src/features/admin/adminService.ts src/features/admin/hooks/useAdminList.ts src/features/admin/components/ListState.tsx src/features/admin/components/OptionSelect.tsx src/features/admin/components/UserForm.tsx src/features/admin/pages/*.tsx`: exit 0.
- `npm run test:integration -- --coverage '--coverage.include=src/features/admin/pages/*.tsx' '--coverage.include=src/features/admin/hooks/*.ts' '--coverage.include=src/features/admin/components/{ListState,OptionSelect,UserForm}.tsx'`: exit 0; 80,32% de linhas/instruções, 80,43% de branches, 81,81% de funções. Essa medição precedeu os cinco últimos testes adicionados; 20 integrações rodaram nessa execução.

Executados em `backend/`, com o wrapper Windows equivalente a `./mvnw`:

- `.\mvnw.cmd verify`: exit 1 antes da compilação; parent Spring Boot 4.0.6 não resolvido, Maven Central bloqueado (`Permission denied: getsockopt`).
- `.\mvnw.cmd -q -DskipITs verify`: exit 1 pelo mesmo bloqueio.
- `.\mvnw.cmd -s "$env:TEMP\harmonia-admin-verification\maven-settings.xml" -q -DskipITs verify`: exit 0; 48 testes do core + 151 do app = 199, sem falhas/erros/ignorados. Os 7 novos ITs foram compilados, mas o Failsafe foi pulado.

O settings temporário usa `file:///C:/Users/rafae/.m2/repository` como mirror e um
repositório de trabalho em `%TEMP%/harmonia-admin-verification/repository`. Nenhuma
configuração Maven do projeto ou do usuário foi alterada. Na contagem de testes,
foi excluído um XML antigo de `HarmoniaApplicationTests`, de 09/09, que permanecia
em `target/surefire-reports`.

`docker version --format '{{.Server.Version}}'`: exit 1; acesso negado a
`npipe:////./pipe/dockerDesktopLinuxEngine`. O sandbox não alcança o Docker.

`git diff --check -- CLAUDE.md backend/harmonia-app web`: exit 0.

## Evidência RED/GREEN e limites

As primeiras integrações web falharam porque as páginas novas ainda não existiam
(`Failed to resolve import ./Enrollments` e `./Teachers`); depois passaram com as
páginas implementadas. O RED dos testes Java não pôde ser executado antes da
implementação por causa da resolução de dependências. A execução com cache local
confirmou posteriormente a compilação e o GREEN dos sete unitários novos.

A revisão encontrou uma recarga que capturava o filtro antigo quando uma alteração
de matrícula terminava após trocar de filtro. `reload` agora consulta o loader
atual; um teste com Promise pendente verifica esse caso. A revisão final não
encontrou bloqueios. A revisão TypeScript teve limite no lint global: erros
preexistentes em `useAuth.tsx` e `apiError.ts`; o lint dos arquivos alterados passou.

A última migration existente foi conferida: V19. V20 atualiza somente as três
roles seed encontradas: ADMIN, TEACHER e STUDENT. A migration não foi aplicada a
um banco nesta execução. Não foram executados ITs, testes de sistema nem smoke
visual/HTTP. Nenhum serviço em 8080/5173 foi iniciado, encerrado ou reiniciado.
Não houve commit ou push; os caminhos protegidos e as alterações anteriores
foram preservados.

Autoavaliação: precisão 4/5 (compilação e testes unitários verificados; HTTP pendente),
completude 4/5 (implementação concluída; ITs dependem de Docker), clareza 4/5
(limites separados dos resultados), aplicabilidade 4/5 (diff pronto para revisão;
validação de banco ainda necessária), concisão 4/5 (evidência detalhada neste arquivo).
Média 4,0/5. Próxima verificação: executar `./mvnw verify` com acesso ao Docker e
conferir as páginas contra a API atualizada.
