# Revisão dos endpoints de cadastro

Os cadastros administrativos foram revisados com a aplicação em uma porta HTTP real e PostgreSQL 16 descartável, gerenciado pelo Testcontainers. Os testes estão em `backend/harmonia-app/src/test/java/br/com/harmonia/system/RegistrationST.java`.

## Cobertura dos cadastros administrativos

| Endpoint | Verificações |
| --- | --- |
| `POST /admin/students` | Criação, login, papel STUDENT, senha armazenada com BCrypt, campos obrigatórios, formato do e-mail, limites de tamanho, username/e-mail duplicados, rollback e permissões |
| `POST /admin/teachers` | Criação, login, papel TEACHER, senha armazenada com BCrypt, campos obrigatórios, formato do e-mail, limites de tamanho, username/e-mail duplicados, rollback e permissões |
| `POST /admin/instruments` | Criação, nome obrigatório, tamanho máximo, duplicidade e permissões |
| `POST /admin/enrollments` | Criação, vínculos persistidos, referências inexistentes, IDs ausentes, UUID inválido e permissões |
| `POST /admin/security/roles` | Criação, campos obrigatórios, limites de tamanho, duplicidade e permissões |

Todos esses endpoints foram testados sem token e com usuários STUDENT e TEACHER sem permissão administrativa. Os testes consultam o banco para verificar vínculos, papel atribuído, hash da senha e ausência de usuários parcialmente persistidos após conflitos.

## Correções

- E-mail obrigatório para alunos e professores. Antes, a ausência chegava à restrição NOT NULL do banco e produzia HTTP 500.
- Limites alinhados ao schema: username 100 caracteres, e-mail 255, nome da pessoa 150, instrumento 80, nome do papel 50 e descrição do papel 255.
- Senhas de cadastro limitadas a 72 bytes UTF-8, considerando o limite do BCrypt. Há testes com caracteres multibyte no limite e acima dele.
- Violações de unicidade do PostgreSQL (`23505`) retornam HTTP 409 com código `DUPLICATE_RESOURCE`, sem expor SQL ou valores internos. Outras falhas de integridade não são convertidas indevidamente em duplicidade.
- Aluno, professor ou instrumento inexistente na matrícula retorna HTTP 404 com código `NOT_FOUND`.

O contrato de sucesso existente foi mantido em HTTP 200. Dados que violam as validações retornam 422; UUID malformado retorna 400. As regras de unicidade continuam garantidas pelo banco, inclusive em requisições concorrentes. Não foi adicionada uma regra de matrícula única, pois o schema atual não define essa restrição.

## Demais fluxos de criação

A suíte de integração existente exercita também transações financeiras (`FinanceIT`), configurações (`SettingIT`), aulas e presença (`TeacherFlowIT`), materiais (`TeacherFlowIT`), horários (`ScheduleIT`), reposições (`MakeupIT`), práticas e metas (`StudentFlowIT`). Esses testes usam MockMvc com o contexto completo e PostgreSQL real; a nova matriz HTTP de casos inválidos se concentra nos cinco cadastros administrativos acima.

## Execução

Na pasta `backend`, com Java 25 e Docker disponíveis:

```powershell
.\mvnw.cmd verify
.\mvnw.cmd verify -Psystem-tests
```

A primeira execução dos novos testes HTTP, antes das correções, reproduziu sete falhas. Os relatórios de integração e sistema são gerados em `backend/harmonia-app/target/failsafe-reports`; os unitários ficam em `target/surefire-reports` de cada módulo. O perfil de sistema sobe e encerra a aplicação automaticamente, sem usar o banco de desenvolvimento.

Resultado após as correções, em 20/09/2026:

- `verify`: 32 testes unitários do core, 14 unitários da aplicação e 32 de integração aprovados. O limite de cobertura do JaCoCo também passou.
- `verify -Psystem-tests`: 18 testes de sistema aprovados, sendo 16 de cadastro e 2 de autenticação. O reactor também repetiu os 32 testes do core.
- Total de 96 testes distintos aprovados, sem falhas ou testes ignorados.

Os logs locais desta revisão ficam em `backend/harmonia-app/target/registration-review/`: `registration-baseline.log`, `registration-system-before.log`, `registration-system-after.log` e `registration-regression.log`. Como os demais artefatos de `target`, eles são removidos por `mvn clean`.
