# Apresentação do framework `lesson-core`

## 1. Visão geral

O `lesson-core` é o framework de domínio responsável pelas regras de aulas da plataforma Harmonia. Ele centraliza decisões que não podem mudar conforme a interface utilizada, como conflito de horários, transições de estado, reposição de aula e efeito da frequência sobre a pontuação do aluno.

Ele não é um framework HTTP e não sobe uma aplicação sozinho. Trata-se de uma biblioteca Java reutilizável, consumida pelo backend Spring Boot. Essa separação permite usar e testar as regras sem banco de dados, servidor web, Spring ou JPA.

O projeto está organizado como um Maven multi-módulo:

```text
backend/
├── lesson-core/       biblioteca Java com as regras de domínio
└── harmonia-app/      aplicação Spring Boot, API, banco e adapters
```

A dependência ocorre em apenas uma direção:

```text
requisição HTTP
      │
      ▼
harmonia-app ── adapta entidades/DTOs ──► lesson-core
      │                                      │
      │                             valida ou rejeita
      ◄──────────────────────────────────────┘
      │
      ▼
persistência e resposta HTTP
```

## 2. Por que ele foi criado

Antes da separação, regras importantes poderiam ficar espalhadas em controllers, services ou consultas ao banco. Isso aumenta o risco de uma mesma regra ser aplicada de formas diferentes e torna os testes dependentes de toda a aplicação.

O framework foi criado para:

- manter as regras em um único lugar;
- impedir que detalhes de Spring ou persistência contaminem o domínio;
- permitir testes rápidos e determinísticos;
- reutilizar as mesmas regras na criação de aulas, horários recorrentes e reposições;
- representar entradas do domínio com objetos imutáveis;
- devolver erros específicos, que a aplicação converte em respostas HTTP adequadas.

## 3. Como foi feito

### 3.1 Núcleo Java puro

O módulo `lesson-core` não possui dependências de produção. JUnit e AssertJ são usados apenas nos testes. Os dados de entrada são representados principalmente por `record`, o que fornece contratos imutáveis e reduz estados inválidos.

Principais componentes:

| Componente | Responsabilidade |
|---|---|
| `TimeRange` | Garante um intervalo válido e detecta sobreposição. |
| `LessonSlot` | Representa uma aula em uma data específica. |
| `WeeklyScheduleSlot` | Representa um horário semanal recorrente. |
| `SchedulingPolicy` | Impede conflitos de professor ou aluno entre aulas e horários recorrentes. |
| `LessonLifecyclePolicy` | Define o estado inicial da aula e controla as mudanças de estado. |
| `AttendanceRecordingRule` | Decide se a aula aceita frequência e se a alteração concede, remove ou não altera XP. |
| `MakeupLinkValidator` | Valida a criação de uma reposição. |
| `AttendanceRecordedEvent` | Comunica ao sistema o efeito de uma frequência, sem acoplar o core à gamificação. |

### 3.2 Objetos válidos desde a criação

`TimeRange` exige que o horário final seja posterior ao inicial. Um intervalo como `11:00–10:00` é rejeitado imediatamente.

O fim do intervalo é exclusivo. Portanto:

- `09:00–10:00` e `09:30–10:30` possuem sobreposição;
- `09:00–10:00` e `10:00–11:00` são consecutivos e válidos.

### 3.3 Políticas de domínio

As regras são classes sem estado e recebem todos os dados necessários como parâmetro. Elas não consultam repositórios e não conhecem entidades JPA.

A `SchedulingPolicy` verifica conflitos quando:

- a data ou o dia da semana coincide;
- os intervalos se sobrepõem; e
- o professor ou o aluno é o mesmo.

Ela é aplicada em três direções:

| Verificação | Método | Exemplo de conflito |
|---|---|---|
| aula × aula | `validateLessonSlot` | duas aulas do professor às 09:00 |
| aula × horário fixo | `validateLessonAgainstWeeklySchedules` | aula de outro aluno dentro do horário fixo de segunda 14:00 |
| horário fixo × aula futura | `validateWeeklySlotAgainstLessons` | horário fixo novo sobre uma aula já agendada |

Duas exceções evitam falsos conflitos:

- aulas canceladas não bloqueiam o horário, e horários recorrentes inativos são filtrados pela aplicação antes de chegar ao core;
- uma aula do **mesmo professor e aluno** de um horário fixo não conflita com ele, porque é justamente a aula que o horário representa.

O ciclo de vida permitido é:

```text
SCHEDULED ──► DONE
     └──────► CANCELED
```

`DONE` e `CANCELED` são estados finais. Repetir o estado atual é aceito, o que torna a operação idempotente, mas uma aula finalizada ou cancelada não pode ser reaberta.

O estado inicial também é decidido pelo core: `initialStatus(data, hoje)` devolve `SCHEDULED` para datas futuras e `DONE` para hoje ou datas passadas. Assim o professor usa a mesma operação para lançar uma aula dada ou agendar uma próxima.

### 3.4 Adapter de integração

No `harmonia-app`, o `LessonSchedulingGuard` funciona como adapter entre a aplicação e o framework. Ele:

1. recebe a matrícula (ou o horário fixo), a data e os horários;
2. obtém o professor e o aluno envolvidos;
3. adquire as travas de concorrência;
4. consulta aulas e horários recorrentes relevantes;
5. converte entidades JPA em objetos do `lesson-core`;
6. executa a `SchedulingPolicy`;
7. permite a persistência somente quando as regras são atendidas.

`assertSlotIsFree` valida uma aula concreta; `assertWeeklySlotIsFree` valida um horário fixo novo ou reativado contra os outros horários fixos e contra as aulas a partir de hoje.

As exceções são traduzidas pelo `GlobalExceptionHandler`:

| Exceção | HTTP | Código da API |
|---|---:|---|
| `ScheduleConflictException` | 409 | `SCHEDULE_CONFLICT` |
| `InvalidMakeupLinkException` | 409 | `INVALID_MAKEUP_LINK` |
| `DomainValidationException` | 422 | `DOMAIN_VALIDATION` |
| `DuplicateResourceException` (aplicação) | 409 | `DUPLICATE_RESOURCE` |
| `ResourceNotFoundException` (aplicação) | 404 | `NOT_FOUND` |

As respostas da API são DTOs (`presentation/response`), não entidades JPA: uma aula volta com `studentName`, `teacherName` e `instrument` já resolvidos, sem expor `enrollment`, `user`, e-mails ou roles.

### 3.5 Concorrência e consistência

Somente consultar se um horário está livre não é suficiente: duas requisições simultâneas poderiam consultar antes de qualquer uma salvar e criar duas aulas conflitantes.

Por isso, `LessonSlotLock` usa `pg_advisory_xact_lock` do PostgreSQL para serializar operações que envolvem o mesmo professor ou aluno. Os identificadores são ordenados antes da aquisição, reduzindo o risco de deadlock. A trava dura apenas até o commit ou rollback da transação.

A migration `V10__enforce_lesson_time_ranges.sql` também exige no banco que `end_time > start_time`. Assim, a regra principal fica no domínio e a restrição estrutural é reforçada na persistência.

### 3.6 Frequência, eventos e XP

Antes de qualquer cálculo, `validateRecordable` recusa frequência em aula `CANCELED` ou em aula cuja data ainda não chegou. Sem essa regra, marcar presença numa aula cancelada daria XP ao aluno.

O core não conhece o valor numérico do XP. A `AttendanceRecordingRule` produz apenas um efeito:

| Alteração | Efeito |
|---|---|
| não presente → `PRESENT` | `AWARD_XP` |
| `PRESENT` → `ABSENT` ou `EXCUSED` | `REVOKE_XP` |
| repetição ou mudança entre estados não presentes | `NONE` |

O `AttendanceUseCase` publica um `AttendanceRecordedEvent` com identificador único. O `GamificationAttendanceListener` interpreta o efeito e aplica os 20 pontos definidos pela aplicação.

A tabela `processed_domain_event`, criada pela migration V11, registra os eventos já tratados. Isso evita que o mesmo evento altere a pontuação duas vezes. Além disso, registrar `PRESENT` novamente gera `NONE`, e corrigir a presença para falta remove os pontos anteriormente concedidos.

### 3.7 Reposição

O `MakeupLinkValidator` estabelece duas condições:

- somente uma aula `DONE` (realizada, por exemplo com falta do aluno) ou `CANCELED` pode originar reposição; aula ainda `SCHEDULED` é recusada;
- uma aula original pode ter no máximo uma reposição.

A nova aula de reposição nasce `SCHEDULED` e também passa pela política de agenda antes de ser salva.

## 4. Onde o framework é usado

| Fluxo da aplicação | Uso do framework |
|---|---|
| `TeacherLessonUseCase.register` | Define o estado inicial pela data e valida intervalo e conflitos antes de criar a aula. |
| `TeacherLessonUseCase.changeStatus` | Valida a transição de estado. |
| `ScheduleUseCase.create` / `setActive` | Valida o horário fixo novo ou reativado contra horários fixos e aulas futuras. |
| `MakeupUseCase.create` | Valida o vínculo da reposição e o horário da nova aula. |
| `AttendanceUseCase.register` | Recusa aula cancelada/futura e calcula o efeito da frequência. |
| `GamificationAttendanceListener` | Consome o evento e concede ou remove XP de forma idempotente. |

Arquivos centrais para mostrar durante a apresentação:

- `backend/lesson-core/src/main/java/br/com/harmonia/lessoncore/`
- `backend/harmonia-app/src/main/java/br/com/harmonia/application/lesson/LessonSchedulingGuard.java`
- `backend/harmonia-app/src/main/java/br/com/harmonia/application/lesson/LessonSlotLock.java`
- `backend/harmonia-app/src/main/java/br/com/harmonia/application/gamification/GamificationAttendanceListener.java`
- `backend/harmonia-app/src/main/java/br/com/harmonia/presentation/response/`
- `backend/harmonia-app/src/main/resources/db/migration/V10__enforce_lesson_time_ranges.sql`
- `backend/harmonia-app/src/main/resources/db/migration/V11__processed_domain_events.sql`

## 5. Estratégia de testes

Os testes do core exercitam as regras sem iniciar Spring ou banco:

```powershell
cd backend
.\mvnw.cmd -pl lesson-core test
```

Os testes do `harmonia-app` verificam as mesmas regras pela API, usando PostgreSQL com Testcontainers:

```powershell
cd backend
.\mvnw.cmd verify
```

Entre os casos cobertos estão intervalo inválido, conflito, horários consecutivos, aula dentro do próprio horário fixo, reativação de horário com vaga ocupada, horário fixo sobre aula futura, aula cancelada liberando o horário, aula futura nascendo agendada, transições finais, reposição de aula cancelada, reposição duplicada, frequência recusada em aula cancelada ou futura e correção de frequência.

A coleção do Postman também roda por linha de comando, com a API no ar:

```powershell
npx newman run postman/Harmonia-lesson-core.postman_collection.json
```

## 6. Como executar a aplicação para a demonstração

Há duas opções.

Somente banco no Docker e aplicação pelo jar:

```powershell
cd backend
docker compose up -d db
.\mvnw.cmd -pl harmonia-app -am package -DskipTests
java -jar harmonia-app\target\harmonia-app-0.0.1-SNAPSHOT.jar
```

Não use `.\mvnw.cmd -pl harmonia-app -am spring-boot:run`: com `-am` o plugin também é executado no pom pai e a aplicação falha com `ClassNotFoundException: org.springframework.boot.SpringApplication`.

Aplicação e banco no Docker:

```powershell
cd backend
docker compose --profile app up --build
```

A API ficará disponível em `http://localhost:8080`. O usuário inicial, criado pela migration V2, é:

```text
usuário: admin
senha:   Admin@123
```

Essas credenciais são apenas para ambiente local.

### Estado da trava de agenda

`LessonSlotLock` executa `pg_advisory_xact_lock` sem tentar mapear o retorno. Como a função do PostgreSQL retorna `void`, essa forma permite que os passos de aula, horário e reposição da collection sejam executados normalmente.

## 7. Preparação do Postman

### Opção recomendada: importar a coleção pronta

O arquivo `postman/Harmonia-lesson-core.postman_collection.json` já contém todas as requisições, autenticação, corpos JSON e testes automáticos (57 requisições, 79 verificações). No Postman:

1. clique em **Import**;
2. selecione o arquivo da coleção;
3. abra a coleção **Harmonia - Demonstração lesson-core**;
4. confirme que a variável `baseUrl` aponta para `http://localhost:8080`;
5. use **Run collection** para executar as requisições na ordem.

A primeira requisição gera um sufixo único, calcula a data de hoje e a da próxima segunda-feira e limpa tokens e IDs anteriores. As respostas seguintes alimentam automaticamente as variáveis da coleção. Não é necessário criar um ambiente no Postman nem copiar IDs manualmente, e a coleção pode ser executada várias vezes na mesma base.

As duas datas têm papéis diferentes:

- `testDate` (próxima segunda) é futura: as aulas nascem `SCHEDULED` e servem para as regras de agenda, horário fixo e reposição;
- `today` é a data atual: a aula nasce `DONE` e aceita frequência, o que permite demonstrar o XP.

Cada grupo termina com um GET que mostra o estado resultante (agenda do dia, horários fixos, histórico, progresso, visão do aluno). Esses GETs são o melhor ponto para abrir a resposta e mostrar o que foi criado ou alterado.

As instruções abaixo permanecem como referência para execução manual com `curl`. Se for montar um ambiente próprio, use as variáveis:

| Variável | Valor inicial |
|---|---|
| `baseUrl` | `http://localhost:8080` |
| `suffix` | um valor único, por exemplo `22092026a` |
| `today` | a data de hoje, no formato `AAAA-MM-DD` |
| `testDate` | a próxima segunda-feira, no formato `AAAA-MM-DD` |
| `adminToken`, `teacherToken`, `studentToken` | vazio |
| `instrumentId`, `teacherId`, `studentId`, `student2Id` | vazio |
| `enrollmentId`, `enrollment2Id` | vazio |
| `lessonId`, `futureLessonId`, `scheduleId`, `makeupLessonId` | vazio |
| `lifecycleOriginalId`, `lifecycleMakeupId` | vazio |

Para importar uma chamada avulsa, use **Import > Raw text** e cole o `curl`. Execute os passos na ordem apresentada; os IDs gerados em um passo são usados nos seguintes.

## 8. Roteiro de `curl`: preparação dos dados

### 8.1 Login do administrador e cadastros

```bash
curl --request POST '{{baseUrl}}/auth/login' --header 'Content-Type: application/json' --data-raw '{"login":"admin","password":"Admin@123"}'
curl --request POST '{{baseUrl}}/admin/instruments' --header 'Authorization: Bearer {{adminToken}}' --header 'Content-Type: application/json' --data-raw '{"name":"Piano {{suffix}}"}'
curl --request POST '{{baseUrl}}/admin/teachers' --header 'Authorization: Bearer {{adminToken}}' --header 'Content-Type: application/json' --data-raw '{"username":"prof{{suffix}}","email":"prof{{suffix}}@harmonia.local","password":"Senha@123","name":"Professor Demo"}'
curl --request POST '{{baseUrl}}/admin/students' --header 'Authorization: Bearer {{adminToken}}' --header 'Content-Type: application/json' --data-raw '{"username":"aluno{{suffix}}","email":"aluno{{suffix}}@harmonia.local","password":"Senha@123","name":"Aluno Demo"}'
curl --request POST '{{baseUrl}}/admin/students' --header 'Authorization: Bearer {{adminToken}}' --header 'Content-Type: application/json' --data-raw '{"username":"aluno2{{suffix}}","email":"aluno2{{suffix}}@harmonia.local","password":"Senha@123","name":"Aluno Dois"}'
```

Guarde `accessToken` como `adminToken` e o `id` de cada cadastro em `instrumentId`, `teacherId`, `studentId` e `student2Id`. O segundo aluno, do mesmo professor, é usado para mostrar conflitos entre alunos diferentes.

### 8.2 Consultar os cadastros (seletores das telas)

```bash
curl --request GET '{{baseUrl}}/admin/students' --header 'Authorization: Bearer {{adminToken}}'
curl --request GET '{{baseUrl}}/admin/teachers' --header 'Authorization: Bearer {{adminToken}}'
curl --request GET '{{baseUrl}}/admin/instruments' --header 'Authorization: Bearer {{adminToken}}'
```

Resultado esperado: listas com `id`, `name` e `username` (ou `id` e `name` para instrumentos). São esses endpoints que alimentam os seletores da tela de matrícula, no lugar de digitar UUIDs.

### 8.3 Criar as matrículas

```bash
curl --request POST '{{baseUrl}}/admin/enrollments' --header 'Authorization: Bearer {{adminToken}}' --header 'Content-Type: application/json' --data-raw '{"studentId":"{{studentId}}","teacherId":"{{teacherId}}","instrumentId":"{{instrumentId}}"}'
```

Guarde o `id` em `enrollmentId`. Repetir a mesma chamada retorna HTTP 409 com `code: DUPLICATE_RESOURCE`, e trocar `studentId` por um UUID inexistente retorna HTTP 404 com `code: NOT_FOUND`. Crie a matrícula do segundo aluno com `{{student2Id}}` e guarde em `enrollment2Id`.

### 8.4 Login do professor e do aluno

```bash
curl --request POST '{{baseUrl}}/auth/login' --header 'Content-Type: application/json' --data-raw '{"login":"prof{{suffix}}","password":"Senha@123"}'
curl --request POST '{{baseUrl}}/auth/login' --header 'Content-Type: application/json' --data-raw '{"login":"aluno{{suffix}}","password":"Senha@123"}'
curl --request GET '{{baseUrl}}/teacher/enrollments' --header 'Authorization: Bearer {{teacherToken}}'
```

O último GET mostra as duas matrículas do professor com `studentName` e `instrument`: é a lista que a tela Nova Aula exibe.

## 9. Validação das regras de agenda

Todas as aulas deste bloco usam `testDate`, a próxima segunda-feira.

### 9.1 Criar uma aula futura

```bash
curl --request POST '{{baseUrl}}/teacher/lessons' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"enrollmentId":"{{enrollmentId}}","date":"{{testDate}}","startTime":"09:00","endTime":"10:00","content":"Escalas"}'
```

Resultado esperado: HTTP 200 e `status: SCHEDULED`, porque a data é futura (`initialStatus`). A resposta traz `studentName`, `teacherName` e `instrument`, sem `enrollment`. Guarde o `id` em `lessonId`.

### 9.2 Sobreposição, horário consecutivo e intervalo inválido

```bash
curl --request POST '{{baseUrl}}/teacher/lessons' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"enrollmentId":"{{enrollmentId}}","date":"{{testDate}}","startTime":"09:30","endTime":"10:30","content":"Sobreposição"}'
curl --request POST '{{baseUrl}}/teacher/lessons' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"enrollmentId":"{{enrollmentId}}","date":"{{testDate}}","startTime":"10:00","endTime":"11:00","content":"Arpejos"}'
curl --request POST '{{baseUrl}}/teacher/lessons' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"enrollmentId":"{{enrollmentId}}","date":"{{testDate}}","startTime":"12:00","endTime":"11:00","content":"Inválida"}'
```

Resultados esperados, na ordem: 409 `SCHEDULE_CONFLICT`; 200 (fim exclusivo do `TimeRange`, guarde em `futureLessonId`); 422 `DOMAIN_VALIDATION`.

### 9.3 Consultar a agenda do dia

```bash
curl --request GET '{{baseUrl}}/teacher/schedule?date={{testDate}}' --header 'Authorization: Bearer {{teacherToken}}'
```

Resultado esperado: as aulas das 09:00 e das 10:00, ordenadas por horário, com `attendance: null`.

### 9.4 Horário fixo e a aula que ele representa

```bash
curl --request POST '{{baseUrl}}/teacher/schedules' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"enrollmentId":"{{enrollmentId}}","weekday":"MONDAY","startTime":"14:00","endTime":"15:00"}'
curl --request GET '{{baseUrl}}/teacher/schedules' --header 'Authorization: Bearer {{teacherToken}}'
curl --request POST '{{baseUrl}}/teacher/lessons' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"enrollmentId":"{{enrollmentId}}","date":"{{testDate}}","startTime":"14:00","endTime":"14:30","content":"Aula do horário fixo"}'
```

Guarde o `id` do horário em `scheduleId`; o GET mostra o horário com `active: true`. A aula do **mesmo aluno** dentro do próprio horário fixo é aceita (HTTP 200): ela é a aula que o horário representa.

### 9.5 Conflito de outro aluno com o horário fixo

```bash
curl --request POST '{{baseUrl}}/teacher/lessons' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"enrollmentId":"{{enrollment2Id}}","date":"{{testDate}}","startTime":"14:30","endTime":"15:30","content":"Invasão do horário fixo"}'
```

Resultado esperado: HTTP 409 e `code: SCHEDULE_CONFLICT`.

### 9.6 Desativar, ocupar a vaga e tentar reativar

```bash
curl --request PATCH '{{baseUrl}}/teacher/schedules/{{scheduleId}}/active' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"active":false}'
curl --request POST '{{baseUrl}}/teacher/lessons' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"enrollmentId":"{{enrollment2Id}}","date":"{{testDate}}","startTime":"14:30","endTime":"15:30","content":"Horário liberado"}'
curl --request PATCH '{{baseUrl}}/teacher/schedules/{{scheduleId}}/active' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"active":true}'
```

Resultados esperados: 200 com `active: false`; 200, porque o adapter não envia horários inativos para a política; e 409 `SCHEDULE_CONFLICT` na reativação, porque a vaga foi ocupada por uma aula futura do segundo aluno.

### 9.7 Horário fixo sobre aula futura

```bash
curl --request POST '{{baseUrl}}/teacher/schedules' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"enrollmentId":"{{enrollment2Id}}","weekday":"MONDAY","startTime":"09:00","endTime":"10:00"}'
curl --request GET '{{baseUrl}}/teacher/schedules' --header 'Authorization: Bearer {{teacherToken}}'
```

Resultado esperado: HTTP 409, porque já existe aula agendada às 09:00 na próxima segunda. O GET continua mostrando apenas o horário original, agora inativo.

## 10. Validação de reposição e cancelamento

### 10.1 Aula ainda agendada não gera reposição

```bash
curl --request POST '{{baseUrl}}/teacher/lessons/{{lessonId}}/makeup' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"date":"{{testDate}}","startTime":"16:00","endTime":"17:00","reason":"Cedo demais"}'
```

Resultado esperado: HTTP 409 e `code: INVALID_MAKEUP_LINK`.

### 10.2 Cancelar a aula e criar a reposição

```bash
curl --request PATCH '{{baseUrl}}/teacher/lessons/{{lessonId}}/status' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"status":"CANCELED"}'
curl --request POST '{{baseUrl}}/teacher/lessons/{{lessonId}}/makeup' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"date":"{{testDate}}","startTime":"16:00","endTime":"17:00","reason":"Reposição demonstrativa"}'
```

Resultados esperados: 200 com `status: CANCELED`; e 200 com `originalLesson.status: CANCELED` e `newLesson.status: SCHEDULED`. Guarde `newLesson.id` em `makeupLessonId`.

### 10.3 Segunda reposição, cancelamento e horário liberado

```bash
curl --request POST '{{baseUrl}}/teacher/lessons/{{lessonId}}/makeup' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"date":"{{testDate}}","startTime":"18:00","endTime":"19:00","reason":"Duplicada"}'
curl --request PATCH '{{baseUrl}}/teacher/lessons/{{makeupLessonId}}/status' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"status":"CANCELED"}'
curl --request POST '{{baseUrl}}/teacher/lessons' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"enrollmentId":"{{enrollmentId}}","date":"{{testDate}}","startTime":"16:00","endTime":"17:00","content":"Horário liberado"}'
curl --request GET '{{baseUrl}}/teacher/schedule?date={{testDate}}' --header 'Authorization: Bearer {{teacherToken}}'
```

Resultados esperados: 409 `INVALID_MAKEUP_LINK` (uma reposição por aula); 200 no cancelamento; 200 na nova aula das 16:00, porque a reposição cancelada liberou o horário. A agenda mostra a aula original e a reposição como `CANCELED` e a nova aula das 16:00 como `SCHEDULED`.

## 11. Validação do ciclo de vida

Este bloco usa `today`, a data atual.

### 11.1 Aula de hoje nasce realizada

```bash
curl --request POST '{{baseUrl}}/teacher/lessons' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"enrollmentId":"{{enrollmentId}}","date":"{{today}}","startTime":"06:00","endTime":"07:00","content":"Aula realizada"}'
```

Resultado esperado: HTTP 200 e `status: DONE`. Guarde o `id` em `lifecycleOriginalId`.

### 11.2 Reposição, finalização e reabertura

```bash
curl --request POST '{{baseUrl}}/teacher/lessons/{{lifecycleOriginalId}}/makeup' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"date":"{{testDate}}","startTime":"20:00","endTime":"21:00","reason":"Reforço"}'
curl --request PATCH '{{baseUrl}}/teacher/lessons/{{lifecycleMakeupId}}/status' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"status":"DONE"}'
curl --request PATCH '{{baseUrl}}/teacher/lessons/{{lifecycleMakeupId}}/status' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"status":"SCHEDULED"}'
curl --request GET '{{baseUrl}}/teacher/lessons?start={{today}}&end={{testDate}}' --header 'Authorization: Bearer {{teacherToken}}'
```

Guarde `newLesson.id` da reposição em `lifecycleMakeupId`. Resultados esperados: 200; 200 com `status: DONE`; 422 `DOMAIN_VALIDATION`, porque `DONE` é estado final. O histórico mostra a aula de hoje e a reposição como `DONE`.

## 12. Validação de frequência e XP

Como os dados foram criados com um `suffix` novo, o aluno começa com zero XP.

### 12.1 Progresso inicial e frequências recusadas

```bash
curl --request GET '{{baseUrl}}/me/progress' --header 'Authorization: Bearer {{studentToken}}'
curl --request POST '{{baseUrl}}/teacher/lessons/{{lessonId}}/attendance' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"status":"PRESENT"}'
curl --request POST '{{baseUrl}}/teacher/lessons/{{futureLessonId}}/attendance' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"status":"PRESENT"}'
```

Resultados esperados: `xpTotal: 0`; 422 `DOMAIN_VALIDATION` para a aula cancelada; 422 `DOMAIN_VALIDATION` para a aula da próxima segunda, que ainda não aconteceu.

### 12.2 Registrar presença e conferir na agenda

```bash
curl --request POST '{{baseUrl}}/teacher/lessons/{{lifecycleOriginalId}}/attendance' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"status":"PRESENT"}'
curl --request GET '{{baseUrl}}/teacher/schedule?date={{today}}' --header 'Authorization: Bearer {{teacherToken}}'
curl --request GET '{{baseUrl}}/me/progress' --header 'Authorization: Bearer {{studentToken}}'
```

Resultados esperados: 200 com `status: PRESENT`; a agenda de hoje mostra a aula com `attendance: PRESENT`; `xpTotal: 20`.

### 12.3 Repetir a presença

```bash
curl --request POST '{{baseUrl}}/teacher/lessons/{{lifecycleOriginalId}}/attendance' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"status":"PRESENT"}'
```

Consulte novamente `/me/progress`. O resultado deve continuar em `xpTotal: 20`, demonstrando que a repetição não concede XP duplicado.

### 12.4 Corrigir a frequência para falta

```bash
curl --request POST '{{baseUrl}}/teacher/lessons/{{lifecycleOriginalId}}/attendance' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"status":"ABSENT","justification":"Correção de lançamento"}'
curl --request GET '{{baseUrl}}/me/progress' --header 'Authorization: Bearer {{studentToken}}'
```

Resultado esperado: `xpTotal: 0`. A correção produz `REVOKE_XP` e desfaz os 20 pontos.

## 13. Consultas finais

```bash
curl --request GET '{{baseUrl}}/me/lessons?status=upcoming' --header 'Authorization: Bearer {{studentToken}}'
curl --request GET '{{baseUrl}}/me/lessons/{{lifecycleOriginalId}}' --header 'Authorization: Bearer {{studentToken}}'
curl --request GET '{{baseUrl}}/teacher/students' --header 'Authorization: Bearer {{teacherToken}}'
curl --request GET '{{baseUrl}}/teacher/students/{{studentId}}' --header 'Authorization: Bearer {{teacherToken}}'
curl --request POST '{{baseUrl}}/teacher/lessons/00000000-0000-0000-0000-000000000000/attendance' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"status":"PRESENT"}'
```

Resultados esperados:

- o aluno vê apenas as próprias aulas, com `teacherName` e `instrument` e sem `enrollment`;
- o detalhe da aula de hoje mostra `status: DONE` e a lista de anexos;
- o professor vê os dois alunos pelo `name`, sem o objeto `user`;
- o relatório do aluno mostra `attendance.absent: 1`, resultado da correção;
- frequência em aula inexistente retorna HTTP 404 com `code: NOT_FOUND`.

## 14. O que destacar para o professor

Uma apresentação curta pode seguir esta ordem:

1. mostrar que `lesson-core` é Java puro e não possui dependências de produção;
2. explicar `TimeRange` e executar os testes de sobreposição e horários consecutivos;
3. mostrar a `SchedulingPolicy` nas três direções (aula × aula, aula × horário fixo, horário fixo × aula futura) e a exceção do mesmo aluno;
4. mostrar o `LessonSchedulingGuard` como fronteira entre JPA/Spring e o core;
5. demonstrar as respostas 404, 409 e 422 no Postman e abrir os GETs de agenda e horários para mostrar o estado;
6. explicar a trava transacional contra concorrência;
7. mostrar o estado inicial pela data e a reposição de aula cancelada;
8. registrar presença, repetir e corrigir para mostrar idempotência e reversibilidade do XP;
9. encerrar mostrando os testes unitários do core e os testes de integração da API.

O principal ponto arquitetural é que o domínio decide **se a operação é válida**, enquanto a aplicação decide **como buscar dados, autenticar, persistir e responder pela API**. Isso torna as regras mais fáceis de manter, testar e reaproveitar.
