# Diagramas UML — Harmonia (entrega TCC)

Diagramas em [Mermaid](https://mermaid.js.org/) (renderizam no GitHub e em editores Markdown).
Complementam o **Diagrama ER** já existente em [`modelo-de-dados.md`](./modelo-de-dados.md).

Conteúdo:
1. [Casos de uso](#1-diagrama-de-casos-de-uso)
2. [Classes (domínio)](#2-diagrama-de-classes)
3. [Sequência — Login + refresh JWT](#3-sequência--login--refresh-de-token-jwt)
4. [Sequência — Registrar prática → XP](#4-sequência--registrar-prática--xp-gamificação)
5. [Sequência — Registrar frequência → XP](#5-sequência--registrar-frequência)
6. [Componentes / Arquitetura](#6-diagrama-de-componentes--arquitetura)

---

## 1. Diagrama de casos de uso

Três atores (Aluno, Professor, Administrador). Mermaid não tem tipo nativo de "use case";
usa-se `flowchart` com elipses (`( )`) representando casos de uso e setas ator → caso.

```mermaid
flowchart LR
    aluno([Aluno])
    prof([Professor])
    admin([Administrador])

    subgraph Auth
        uc01(("RF01 Login"))
        uc02(("RF02 Recuperar senha"))
    end

    subgraph Aluno_UC["Aluno"]
        uc03(("RF03 Dashboard XP/nível/streak"))
        uc04(("RF04 Consultar aulas"))
        uc05(("RF05 Detalhes da aula"))
        uc06(("RF06 Materiais"))
        uc07(("RF07 Registrar prática"))
        uc08(("RF08 Ver progresso"))
        uc09(("RF09 Gerenciar metas"))
    end

    subgraph Professor_UC["Professor"]
        uc10(("RF10 Dashboard"))
        uc11(("RF11 Listar alunos"))
        uc12(("RF12 Detalhes do aluno"))
        uc13(("RF13 Registrar aula"))
        uc14(("RF14 Registrar frequência"))
        uc15(("RF15 Histórico de aulas"))
        uc16(("RF16 Anexar material"))
        uc17(("RF17 Agenda"))
        uc18(("RF18 Relatórios"))
    end

    subgraph Admin_UC["Administrador"]
        uc20(("RF20-25 Cadastros"))
        uc28(("RF28 Usuários/roles/permissões"))
        uc29(("RF29 Configurações"))
    end

    aluno --> uc01 & uc02
    prof --> uc01 & uc02
    admin --> uc01

    aluno --> uc03 & uc04 & uc05 & uc06 & uc07 & uc08 & uc09
    prof --> uc10 & uc11 & uc12 & uc13 & uc14 & uc15 & uc16 & uc17 & uc18
    admin --> uc20 & uc28 & uc29
```

> RF19/RF26/RF27/RF30 (dashboard admin, reposições, financeiro, relatórios admin) são fase
> posterior; omitidos do MVP.

---

## 2. Diagrama de classes

Modelo de domínio (entidades de negócio + núcleo de segurança RBAC/PBAC). Reflete o ER, com
foco em atributos e métodos de negócio. `Administrator` = `User` com role `ADMIN` (sem classe
própria). Nomes em inglês (ver `glossario-en.md`).

```mermaid
classDiagram
    class User {
        +UUID id
        +String username
        +String email
        +String password
        +boolean active
        +getAuthorities() Collection
    }
    class Role {
        +Long id
        +String name
        +String description
    }
    class Permission {
        +Long id
        +String name
        +String description
    }
    class RefreshToken {
        +UUID id
        +String tokenHash
        +LocalDateTime expiresAt
        +LocalDateTime revokedAt
    }

    class Student {
        +UUID id
    }
    class Teacher {
        +UUID id
    }
    class Instrument {
        +UUID id
        +String name
    }
    class Enrollment {
        +UUID id
    }
    class Lesson {
        +UUID id
        +LocalDate date
        +LocalTime startTime
        +String content
        +String homework
        +LessonStatus status
    }
    class Attendance {
        +UUID id
        +AttendanceStatus status
        +String justification
    }
    class Material {
        +UUID id
        +String title
        +String fileName
    }
    class Practice {
        +UUID id
        +int durationMin
        +int xpEarned
        +LocalDate date
    }
    class Progress {
        +UUID id
        +int xpTotal
        +int level
        +int streakDays
        +int totalPracticeMin
    }
    class Goal {
        +UUID id
        +String title
        +GoalType type
        +int target
        +GoalStatus status
    }
    class GamificationService {
        +xpFromPractice(int) int
        +xpFromAttendance() int
        +level(int) int
        +newStreak(int, LocalDate, LocalDate) int
    }

    User "*" -- "*" Role
    Role "*" -- "*" Permission
    User "1" -- "*" RefreshToken
    User "1" -- "1" Student
    User "1" -- "1" Teacher

    Student "1" -- "*" Enrollment
    Teacher "1" -- "*" Enrollment
    Instrument "1" -- "*" Enrollment
    Teacher "*" -- "*" Instrument : teaches

    Enrollment "1" -- "*" Lesson
    Lesson "1" -- "0..1" Attendance
    Student "1" -- "*" Material : receives
    Teacher "1" -- "*" Material : sends

    Student "1" -- "*" Practice
    Student "1" -- "1" Progress
    Student "1" -- "*" Goal
```

---

## 3. Sequência — Login + refresh de token JWT

Autenticação stateless: access JWT curto + refresh token longo (hash SHA-256 no banco).
Quando o access expira (401), o cliente troca o refresh por um novo par automaticamente.

```mermaid
sequenceDiagram
    actor U as Usuário
    participant C as Cliente (mobile/web)
    participant API as AuthController
    participant UC as AuthUseCase
    participant DB as PostgreSQL

    U->>C: login + senha
    C->>API: POST /auth/login
    API->>UC: autenticar(login, senha)
    UC->>DB: buscar usuário + validar BCrypt
    DB-->>UC: usuário
    UC->>UC: gera access JWT (RSA) + refresh
    UC->>DB: salva hash do refresh
    UC-->>API: accessToken + refreshToken
    API-->>C: 200 tokens
    C->>C: armazena tokens (SecureStore / localStorage)

    Note over C,API: chamada protegida com access expirado
    C->>API: GET /me/dashboard (Bearer access)
    API-->>C: 401 Unauthorized
    C->>API: POST /auth/refresh (refreshToken)
    API->>UC: renovar(refreshToken)
    UC->>DB: valida hash + não revogado/expirado
    UC-->>API: novo access + refresh
    API-->>C: 200 novos tokens
    C->>API: repete GET /me/dashboard (novo access)
    API-->>C: 200 dados
```

---

## 4. Sequência — Registrar prática → XP (gamificação)

RF07 + RN07: prática gera XP, atualiza progresso (nível, sequência/streak).

```mermaid
sequenceDiagram
    actor A as Aluno
    participant C as App (mobile/web)
    participant API as StudentController
    participant UC as PracticeUseCase
    participant DOM as GamificationService
    participant DB as PostgreSQL

    A->>C: informa duração + observação
    C->>API: POST /me/practices
    API->>UC: register(studentId, durationMin)
    UC->>DB: salva Practice (xpEarned)
    UC->>DB: carrega Progress do aluno
    UC->>DOM: level(xpTotal) + newStreak(...)
    DOM-->>UC: xpTotal, level, streakDays
    UC->>DB: salva Progress
    UC-->>API: progress (xp, level, streakDays)
    API-->>C: 200 progress atualizado
    C-->>A: feedback XP/nível
```

---

## 5. Sequência — Registrar frequência

RF14 + RN08/RN09: professor marca presença; ownership garante só alunos vinculados.

```mermaid
sequenceDiagram
    actor P as Professor
    participant C as App
    participant API as TeacherController
    participant SEC as Spring Security (@PreAuthorize)
    participant UC as AttendanceUseCase
    participant DB as PostgreSQL

    P->>C: marca PRESENT/ABSENT/EXCUSED
    C->>API: POST /teacher/lessons/{id}/attendance
    API->>SEC: hasAuthority('attendance.manage')?
    SEC-->>API: ok
    API->>UC: register(teacherId, lessonId, status)
    UC->>DB: carrega lesson + enrollment
    UC->>UC: ownership: enrollment.teacher == teacherId? (RN12)
    alt não vinculado
        UC-->>API: 403 Forbidden
    else vinculado
        UC->>DB: salva/atualiza Attendance
        UC-->>API: 200 attendance registrada
    end
    API-->>C: resposta
```

---

## 6. Diagrama de componentes / arquitetura

Monorepo (backend + mobile + web) sobre uma única API REST. Backend em Clean Architecture
(dependências apontam para dentro).

```mermaid
flowchart TB
    subgraph Clientes
        mobile["Mobile (Expo / React Native)<br/>Aluno + Professor"]
        web["Web (Vite / React)<br/>Admin Configurador"]
    end

    subgraph Backend["Backend — Spring Boot 4 (Clean Architecture)"]
        pres["presentation<br/>Controllers REST + DTOs"]
        app["application<br/>Use Cases + portas"]
        dom["domain<br/>regras (XP, ownership, frequência)"]
        infra["infrastructure<br/>JPA, JWT RSA, storage"]
    end

    db[("PostgreSQL<br/>+ Flyway")]
    storage[["Storage de arquivos<br/>(local dev / S3 prod)"]]

    mobile -->|HTTPS + JWT| pres
    web -->|HTTPS + JWT| pres
    pres --> app
    app --> dom
    app --> infra
    infra --> db
    infra --> storage

    classDef inner fill:#eef,stroke:#66f
    class dom,app inner
```

> **Regra Clean Architecture:** `domain` não conhece Spring/JPA. `application` depende só de
> `domain` (via portas). `infrastructure` implementa as portas. `presentation` traduz HTTP ↔ use case.
