# lesson-core

Biblioteca de regras de domínio para aplicações de aulas individuais. O módulo é Java puro: não depende de Spring, JPA, HTTP ou banco de dados.

O projeto consumidor converte suas entidades para os tipos do módulo, executa as políticas e só então persiste a alteração. Essa separação permite testar as regras sem subir a aplicação.

## O que o módulo oferece

- `TimeRange`: intervalo válido de um dia, com detecção de sobreposição. O fim é exclusivo.
- `LessonSlot`: representação de uma aula em uma data específica.
- `WeeklyScheduleSlot`: representação de um horário semanal recorrente.
- `SchedulingPolicy`: conflitos entre professor/aluno, tanto para aulas concretas quanto para horários recorrentes.
- `LessonLifecyclePolicy`: transições permitidas entre `SCHEDULED`, `DONE` e `CANCELED`.
- `AttendanceRecordingRule`: efeito de XP produzido por uma mudança de frequência.
- `MakeupLinkValidator`: regras para vincular uma reposição à aula original.

As classes não conhecem entidades de persistência nem publicam eventos. A aplicação decide como traduzir exceções, armazenar os dados e distribuir eventos.

## Uso básico

```java
var candidate = new LessonSlot(
    lessonId, teacherId, studentId, date,
    new TimeRange(startTime, endTime),
    SessionStatus.SCHEDULED
);

policy.validateLessonSlot(candidate, existingLessons);
policy.validateLessonAgainstWeeklySchedules(candidate, recurringSchedules);
```

`ScheduleConflictException` representa conflito de agenda. As demais violações são `DomainValidationException` ou exceções específicas da regra.

## Build

```bash
cd backend
./mvnw -pl lesson-core test
```

O artefato não carrega dependências de produção. JUnit e AssertJ aparecem somente no classpath de testes.
