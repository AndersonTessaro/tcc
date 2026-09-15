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
| `SchedulingPolicy` | Impede conflitos de professor ou aluno. |
| `LessonLifecyclePolicy` | Controla as mudanças permitidas no estado da aula. |
| `AttendanceRecordingRule` | Decide se uma alteração de frequência concede, remove ou não altera XP. |
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

Aulas canceladas não bloqueiam o horário. Horários recorrentes inativos são filtrados pela aplicação antes de chegar ao core.

O ciclo de vida permitido é:

```text
SCHEDULED ──► DONE
     └──────► CANCELED
```

`DONE` e `CANCELED` são estados finais. Repetir o estado atual é aceito, o que torna a operação idempotente, mas uma aula finalizada ou cancelada não pode ser reaberta.

### 3.4 Adapter de integração

No `harmonia-app`, o `LessonSchedulingGuard` funciona como adapter entre a aplicação e o framework. Ele:

1. recebe a matrícula, data e horários;
2. obtém o professor e o aluno envolvidos;
3. adquire as travas de concorrência;
4. consulta aulas e horários recorrentes relevantes;
5. converte entidades JPA em objetos do `lesson-core`;
6. executa a `SchedulingPolicy`;
7. permite a persistência somente quando as regras são atendidas.

As exceções do core são traduzidas pelo `GlobalExceptionHandler`:

| Exceção do domínio | HTTP | Código da API |
|---|---:|---|
| `ScheduleConflictException` | 409 | `SCHEDULE_CONFLICT` |
| `InvalidMakeupLinkException` | 409 | `INVALID_MAKEUP_LINK` |
| `DomainValidationException` | 422 | `DOMAIN_VALIDATION` |

### 3.5 Concorrência e consistência

Somente consultar se um horário está livre não é suficiente: duas requisições simultâneas poderiam consultar antes de qualquer uma salvar e criar duas aulas conflitantes.

Por isso, `LessonSlotLock` usa `pg_advisory_xact_lock` do PostgreSQL para serializar operações que envolvem o mesmo professor ou aluno. Os identificadores são ordenados antes da aquisição, reduzindo o risco de deadlock. A trava dura apenas até o commit ou rollback da transação.

A migration `V10__enforce_lesson_time_ranges.sql` também exige no banco que `end_time > start_time`. Assim, a regra principal fica no domínio e a restrição estrutural é reforçada na persistência.

### 3.6 Frequência, eventos e XP

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

- somente uma aula com estado `DONE` pode originar reposição;
- uma aula original pode ter no máximo uma reposição.

A nova aula de reposição também passa pela política de agenda antes de ser salva.

## 4. Onde o framework é usado

| Fluxo da aplicação | Uso do framework |
|---|---|
| `TeacherLessonUseCase.register` | Valida o intervalo e os conflitos antes de criar a aula. |
| `TeacherLessonUseCase.changeStatus` | Valida a transição de estado. |
| `ScheduleUseCase.create` | Valida conflitos entre horários semanais recorrentes. |
| `MakeupUseCase.create` | Valida o vínculo da reposição e o horário da nova aula. |
| `AttendanceUseCase.register` | Calcula o efeito da alteração de frequência. |
| `GamificationAttendanceListener` | Consome o evento e concede ou remove XP de forma idempotente. |

Arquivos centrais para mostrar durante a apresentação:

- `backend/lesson-core/src/main/java/br/com/harmonia/lessoncore/`
- `backend/harmonia-app/src/main/java/br/com/harmonia/application/lesson/LessonSchedulingGuard.java`
- `backend/harmonia-app/src/main/java/br/com/harmonia/application/lesson/LessonSlotLock.java`
- `backend/harmonia-app/src/main/java/br/com/harmonia/application/gamification/GamificationAttendanceListener.java`
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

Entre os casos cobertos estão intervalo inválido, conflito, horários consecutivos, aula cancelada liberando o horário, transições finais, reposição duplicada e correção de frequência.

## 6. Como executar a aplicação para a demonstração

Há duas opções.

Somente banco no Docker e aplicação pelo Maven:

```powershell
cd backend
docker compose up -d db
.\mvnw.cmd -pl harmonia-app -am spring-boot:run
```

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

### Atenção antes da demonstração na `main` atual

No estado atual da `main`, `LessonSlotLock` usa `queryForObject(..., Long.class)` para executar `pg_advisory_xact_lock`. Essa função do PostgreSQL retorna `void`, portanto a tentativa de convertê-la para `Long` causa `DataIntegrityViolationException` nos fluxos de aula e horário.

A correção já existe no commit `601af72` (`fix(lesson-core): execute advisory lock without result mapping`), mas esse commit não faz parte da `main` atual. Antes da demonstração dos passos de agenda, a correção precisa estar integrada: a consulta deve ser executada sem mapear o retorno para `Long`. Login e cadastros administrativos não dependem dessa trava, mas os passos a partir da criação da primeira aula dependem.

## 7. Preparação do Postman

Crie um ambiente chamado `Harmonia local` com as variáveis abaixo:

| Variável | Valor inicial |
|---|---|
| `baseUrl` | `http://localhost:8080` |
| `suffix` | um valor único, por exemplo `15092026a` |
| `testDate` | uma data que seja segunda-feira, no formato `AAAA-MM-DD` |
| `adminToken` | vazio |
| `teacherToken` | vazio |
| `studentToken` | vazio |
| `instrumentId` | vazio |
| `teacherId` | vazio |
| `studentId` | vazio |
| `enrollmentId` | vazio |
| `lessonId` | vazio |
| `scheduleId` | vazio |
| `makeupLessonId` | vazio |
| `lifecycleOriginalId` | vazio |
| `lifecycleMakeupId` | vazio |

O `suffix` evita conflito com nomes e e-mails únicos de execuções anteriores. A `testDate` deve ser uma segunda-feira porque o roteiro cria um horário recorrente com `MONDAY`.

Para importar cada chamada, use **Import > Raw text** no Postman e cole o respectivo `curl`. Nos passos que criam tokens ou IDs, adicione o script indicado na aba **Scripts > Post-response**. Execute os passos na ordem apresentada.

## 8. Roteiro de `curl`: preparação dos dados

### 8.1 Login do administrador

```bash
curl --request POST '{{baseUrl}}/auth/login' --header 'Content-Type: application/json' --data-raw '{"login":"admin","password":"Admin@123"}'
```

Resultado esperado: HTTP 200, com `accessToken`, `username` e `authorities`.

Script pós-resposta:

```javascript
pm.test("login do administrador", () => pm.response.to.have.status(200));
pm.environment.set("adminToken", pm.response.json().accessToken);
```

### 8.2 Confirmar usuário autenticado

```bash
curl --request GET '{{baseUrl}}/auth/me' --header 'Authorization: Bearer {{adminToken}}'
```

Resultado esperado: HTTP 200 e `username` igual a `admin`.

### 8.3 Criar instrumento

```bash
curl --request POST '{{baseUrl}}/admin/instruments' --header 'Authorization: Bearer {{adminToken}}' --header 'Content-Type: application/json' --data-raw '{"name":"Violão Framework {{suffix}}"}'
```

Script pós-resposta:

```javascript
pm.test("instrumento criado", () => pm.response.to.have.status(200));
pm.environment.set("instrumentId", pm.response.json().id);
```

### 8.4 Criar professor

```bash
curl --request POST '{{baseUrl}}/admin/teachers' --header 'Authorization: Bearer {{adminToken}}' --header 'Content-Type: application/json' --data-raw '{"username":"prof_framework_{{suffix}}","email":"prof_{{suffix}}@harmonia.local","password":"Teach@1234","name":"Professor Framework"}'
```

Script pós-resposta:

```javascript
pm.test("professor criado", () => pm.response.to.have.status(200));
pm.environment.set("teacherId", pm.response.json().id);
```

### 8.5 Criar aluno

```bash
curl --request POST '{{baseUrl}}/admin/students' --header 'Authorization: Bearer {{adminToken}}' --header 'Content-Type: application/json' --data-raw '{"username":"aluno_framework_{{suffix}}","email":"aluno_{{suffix}}@harmonia.local","password":"Student@123","name":"Aluno Framework"}'
```

Script pós-resposta:

```javascript
pm.test("aluno criado", () => pm.response.to.have.status(200));
pm.environment.set("studentId", pm.response.json().id);
```

### 8.6 Criar matrícula

```bash
curl --request POST '{{baseUrl}}/admin/enrollments' --header 'Authorization: Bearer {{adminToken}}' --header 'Content-Type: application/json' --data-raw '{"studentId":"{{studentId}}","teacherId":"{{teacherId}}","instrumentId":"{{instrumentId}}"}'
```

Script pós-resposta:

```javascript
pm.test("matrícula criada", () => pm.response.to.have.status(200));
pm.environment.set("enrollmentId", pm.response.json().id);
```

### 8.7 Login do professor

```bash
curl --request POST '{{baseUrl}}/auth/login' --header 'Content-Type: application/json' --data-raw '{"login":"prof_framework_{{suffix}}","password":"Teach@1234"}'
```

Script pós-resposta:

```javascript
pm.test("login do professor", () => pm.response.to.have.status(200));
pm.environment.set("teacherToken", pm.response.json().accessToken);
```

### 8.8 Login do aluno

```bash
curl --request POST '{{baseUrl}}/auth/login' --header 'Content-Type: application/json' --data-raw '{"login":"aluno_framework_{{suffix}}","password":"Student@123"}'
```

Script pós-resposta:

```javascript
pm.test("login do aluno", () => pm.response.to.have.status(200));
pm.environment.set("studentToken", pm.response.json().accessToken);
```

## 9. Validação das regras de agenda

### 9.1 Criar uma aula válida

```bash
curl --request POST '{{baseUrl}}/teacher/lessons' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"enrollmentId":"{{enrollmentId}}","date":"{{testDate}}","startTime":"09:00","endTime":"10:00","content":"Demonstração do framework","homework":"Praticar escalas"}'
```

Resultado esperado: HTTP 200. Na implementação atual, uma aula comum registrada pelo professor é salva como `DONE`.

Script pós-resposta:

```javascript
pm.test("aula válida criada", () => pm.response.to.have.status(200));
pm.environment.set("lessonId", pm.response.json().id);
```

### 9.2 Tentar criar uma aula sobreposta

```bash
curl --request POST '{{baseUrl}}/teacher/lessons' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"enrollmentId":"{{enrollmentId}}","date":"{{testDate}}","startTime":"09:30","endTime":"10:30","content":"Deve falhar"}'
```

Resultado esperado: HTTP 409 e `code: SCHEDULE_CONFLICT`.

Script opcional de validação:

```javascript
pm.test("sobreposição rejeitada", () => {
  pm.response.to.have.status(409);
  pm.expect(pm.response.json().code).to.eql("SCHEDULE_CONFLICT");
});
```

### 9.3 Criar uma aula imediatamente após a primeira

```bash
curl --request POST '{{baseUrl}}/teacher/lessons' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"enrollmentId":"{{enrollmentId}}","date":"{{testDate}}","startTime":"10:00","endTime":"11:00","content":"Horário consecutivo permitido"}'
```

Resultado esperado: HTTP 200. Isso demonstra o fim exclusivo do `TimeRange`.

### 9.4 Enviar um intervalo inválido

```bash
curl --request POST '{{baseUrl}}/teacher/lessons' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"enrollmentId":"{{enrollmentId}}","date":"{{testDate}}","startTime":"12:00","endTime":"11:00","content":"Deve falhar"}'
```

Resultado esperado: HTTP 422, `code: DOMAIN_VALIDATION` e mensagem informando que o fim deve ser posterior ao início.

### 9.5 Criar um horário semanal recorrente

```bash
curl --request POST '{{baseUrl}}/teacher/schedules' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"enrollmentId":"{{enrollmentId}}","weekday":"MONDAY","startTime":"14:00","endTime":"15:00"}'
```

Script pós-resposta:

```javascript
pm.test("horário recorrente criado", () => pm.response.to.have.status(200));
pm.environment.set("scheduleId", pm.response.json().id);
```

### 9.6 Tentar criar aula contra o horário recorrente

```bash
curl --request POST '{{baseUrl}}/teacher/lessons' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"enrollmentId":"{{enrollmentId}}","date":"{{testDate}}","startTime":"14:30","endTime":"15:30","content":"Conflito com recorrência"}'
```

Resultado esperado: HTTP 409 e `code: SCHEDULE_CONFLICT`.

### 9.7 Desativar o horário recorrente

```bash
curl --request PATCH '{{baseUrl}}/teacher/schedules/{{scheduleId}}/active' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"active":false}'
```

Resultado esperado: HTTP 200 e `active: false`.

### 9.8 Repetir a criação após desativar o horário

```bash
curl --request POST '{{baseUrl}}/teacher/lessons' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"enrollmentId":"{{enrollmentId}}","date":"{{testDate}}","startTime":"14:30","endTime":"15:30","content":"Agora permitido"}'
```

Resultado esperado: HTTP 200. O adapter não envia horários inativos para a política.

## 10. Validação de reposição e cancelamento

### 10.1 Criar uma reposição para a primeira aula

```bash
curl --request POST '{{baseUrl}}/teacher/lessons/{{lessonId}}/makeup' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"date":"{{testDate}}","startTime":"16:00","endTime":"17:00","reason":"Reposição demonstrativa"}'
```

Resultado esperado: HTTP 200, com `originalLesson` e `newLesson`. A nova aula começa como `SCHEDULED`.

Script pós-resposta:

```javascript
pm.test("reposição criada", () => pm.response.to.have.status(200));
pm.environment.set("makeupLessonId", pm.response.json().newLesson.id);
```

### 10.2 Tentar criar uma segunda reposição para a mesma aula

```bash
curl --request POST '{{baseUrl}}/teacher/lessons/{{lessonId}}/makeup' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"date":"{{testDate}}","startTime":"17:00","endTime":"18:00","reason":"Deve falhar"}'
```

Resultado esperado: HTTP 409 e `code: INVALID_MAKEUP_LINK`.

### 10.3 Cancelar a aula de reposição

```bash
curl --request PATCH '{{baseUrl}}/teacher/lessons/{{makeupLessonId}}/status' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"status":"CANCELED"}'
```

Resultado esperado: HTTP 200 e `status: CANCELED`.

### 10.4 Comprovar que o cancelamento liberou o horário

```bash
curl --request POST '{{baseUrl}}/teacher/lessons' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"enrollmentId":"{{enrollmentId}}","date":"{{testDate}}","startTime":"16:00","endTime":"17:00","content":"Horário liberado pelo cancelamento"}'
```

Resultado esperado: HTTP 200.

## 11. Validação do ciclo de vida

Uma nova reposição será usada porque a anterior foi cancelada e estados finais não podem ser reabertos.

### 11.1 Criar outra aula original

```bash
curl --request POST '{{baseUrl}}/teacher/lessons' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"enrollmentId":"{{enrollmentId}}","date":"{{testDate}}","startTime":"18:00","endTime":"19:00","content":"Aula para testar ciclo de vida"}'
```

Script pós-resposta:

```javascript
pm.test("segunda aula original criada", () => pm.response.to.have.status(200));
pm.environment.set("lifecycleOriginalId", pm.response.json().id);
```

### 11.2 Criar a reposição agendada

```bash
curl --request POST '{{baseUrl}}/teacher/lessons/{{lifecycleOriginalId}}/makeup' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"date":"{{testDate}}","startTime":"20:00","endTime":"21:00","reason":"Teste de ciclo de vida"}'
```

Script pós-resposta:

```javascript
pm.test("reposição para ciclo de vida criada", () => pm.response.to.have.status(200));
pm.environment.set("lifecycleMakeupId", pm.response.json().newLesson.id);
```

### 11.3 Finalizar a reposição

```bash
curl --request PATCH '{{baseUrl}}/teacher/lessons/{{lifecycleMakeupId}}/status' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"status":"DONE"}'
```

Resultado esperado: HTTP 200 e `status: DONE`.

### 11.4 Tentar reabrir a aula finalizada

```bash
curl --request PATCH '{{baseUrl}}/teacher/lessons/{{lifecycleMakeupId}}/status' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"status":"SCHEDULED"}'
```

Resultado esperado: HTTP 422 e `code: DOMAIN_VALIDATION`.

## 12. Validação de frequência e XP

Como os dados foram criados com um `suffix` novo, o aluno começa com zero XP.

### 12.1 Consultar o progresso inicial

```bash
curl --request GET '{{baseUrl}}/me/progress' --header 'Authorization: Bearer {{studentToken}}'
```

Resultado esperado: HTTP 200 e `xpTotal: 0`.

### 12.2 Registrar presença

```bash
curl --request POST '{{baseUrl}}/teacher/lessons/{{lessonId}}/attendance' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"status":"PRESENT"}'
```

Resultado esperado: HTTP 200 e `status: PRESENT`.

### 12.3 Conferir a concessão de XP

```bash
curl --request GET '{{baseUrl}}/me/progress' --header 'Authorization: Bearer {{studentToken}}'
```

Resultado esperado: `xpTotal: 20`.

### 12.4 Registrar a mesma presença novamente

```bash
curl --request POST '{{baseUrl}}/teacher/lessons/{{lessonId}}/attendance' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"status":"PRESENT"}'
```

Consulte novamente `/me/progress`. O resultado deve continuar em `xpTotal: 20`, demonstrando que a repetição não concede XP duplicado.

### 12.5 Corrigir a frequência para falta

```bash
curl --request POST '{{baseUrl}}/teacher/lessons/{{lessonId}}/attendance' --header 'Authorization: Bearer {{teacherToken}}' --header 'Content-Type: application/json' --data-raw '{"status":"ABSENT","justification":"Correção para demonstrar reversibilidade"}'
```

Consulte novamente o progresso:

```bash
curl --request GET '{{baseUrl}}/me/progress' --header 'Authorization: Bearer {{studentToken}}'
```

Resultado esperado: `xpTotal: 0`. A correção produz `REVOKE_XP` e desfaz os 20 pontos.

## 13. O que destacar para o professor

Uma apresentação curta pode seguir esta ordem:

1. mostrar que `lesson-core` é Java puro e não possui dependências de produção;
2. explicar `TimeRange` e executar os testes de sobreposição e horários consecutivos;
3. mostrar a `SchedulingPolicy` sendo reutilizada por aulas, recorrências e reposições;
4. mostrar o `LessonSchedulingGuard` como fronteira entre JPA/Spring e o core;
5. demonstrar as respostas 409 e 422 no Postman;
6. explicar a trava transacional contra concorrência;
7. registrar presença, repetir e corrigir para mostrar idempotência e reversibilidade do XP;
8. encerrar mostrando os testes unitários do core e os testes de integração da API.

O principal ponto arquitetural é que o domínio decide **se a operação é válida**, enquanto a aplicação decide **como buscar dados, autenticar, persistir e responder pela API**. Isso torna as regras mais fáceis de manter, testar e reaproveitar.
