# Framework de domínio de aulas

## Objetivo

O `lesson-core` concentra as regras que precisam ser iguais em qualquer interface da Harmonia. O módulo não é um servidor nem um conjunto de entidades JPA. Ele funciona como uma biblioteca pequena, com objetos imutáveis e políticas que recebem dados e validam decisões.

A aplicação continua responsável por autenticação, autorização, transações, consultas, persistência e respostas HTTP.

## Limites entre os módulos

```text
harmonia-app
  ├─ busca entidades e monta os objetos do core
  ├─ chama as políticas
  ├─ persiste quando a validação passa
  └─ traduz exceções e eventos para a infraestrutura

lesson-core
  ├─ valida intervalos e conflitos
  ├─ controla o ciclo de vida da aula
  ├─ calcula o efeito de uma alteração de frequência
  └─ não acessa banco, Spring ou HTTP
```

A direção da dependência é sempre `harmonia-app → lesson-core`.

## Modelo de agenda

`TimeRange` exige início e fim e rejeita intervalos vazios ou invertidos. A comparação usa fim exclusivo: uma aula das 10:00 às 11:00 pode ser seguida por outra que começa às 11:00.

`LessonSlot` representa uma ocorrência concreta. `WeeklyScheduleSlot` representa uma reserva semanal. A `SchedulingPolicy` considera conflito quando:

- as datas (ou o dia da semana) coincidem;
- os intervalos se sobrepõem; e
- o professor ou o aluno é o mesmo.

Aulas canceladas não bloqueiam novos horários. Horários recorrentes inativos devem ser filtrados pelo adapter antes da validação.

## Ciclo de vida

As transições aceitas são:

```text
SCHEDULED ──► DONE
     └──────► CANCELED
```

`DONE` e `CANCELED` são estados finais. Repetir o mesmo estado é permitido para tornar operações idempotentes; reabrir uma aula não é permitido pela política.

## Frequência e XP

`AttendanceRecordingRule` recebe o estado anterior e o novo estado:

| Transição | Efeito |
|---|---|
| qualquer estado não presente → `PRESENT` | `AWARD_XP` |
| `PRESENT` → falta ou justificada | `REVOKE_XP` |
| mesma situação ou entre situações não presentes | `NONE` |

O core não sabe quanto vale o XP. O consumidor aplica o valor da sua própria política de gamificação. No backend atual, o evento possui um identificador e os eventos processados são registrados para evitar reaplicação.

## Reposição

Uma reposição só pode ser criada para uma aula concluída e uma aula original pode ter no máximo uma reposição. A nova ocorrência passa novamente pela validação de conflito de professor, aluno e horário recorrente.

## Integração com uma aplicação

O adapter deve:

1. carregar as aulas e horários que podem conflitar;
2. converter entidades para `LessonSlot` e `WeeklyScheduleSlot`;
3. executar `SchedulingPolicy` dentro da transação;
4. persistir a nova entidade;
5. traduzir `ScheduleConflictException` para o protocolo da aplicação.

No `harmonia-app`, esse trabalho fica em `LessonSchedulingGuard`. A criação e a reposição usam locks consultivos do PostgreSQL para serializar operações que envolvem o mesmo professor ou aluno. O lock é liberado automaticamente no commit ou rollback.

## Banco e migrations

O core não cria tabelas. As migrations ficam no módulo da aplicação. A V10 garante que aulas e horários tenham fim válido; a V11 registra eventos de domínio já processados. Migrations aplicadas não devem ser editadas: qualquer correção futura deve ser uma nova versão.

## Testes

Os testes do core não precisam de banco nem de contexto Spring:

```bash
cd backend
./mvnw -pl lesson-core test
```

Os testes de integração do `harmonia-app` cobrem a mesma regra através da API e precisam do PostgreSQL/Testcontainers.

## Evolução

Novas regras devem entrar como políticas ou value objects independentes. O módulo não deve receber repositórios, anotações de framework ou DTOs HTTP. Quando uma regra exigir dados externos, a aplicação deve buscá-los e entregar ao core uma coleção ou um objeto de entrada imutável.
