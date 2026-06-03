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
foco em atributos e métodos de negócio. `Administrador` = `Usuario` com role `ADMIN` (sem classe
própria).

```mermaid
classDiagram
    class Usuario {
        +UUID id
        +String username
        +String email
        +String password
        +boolean ativo
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

    class Aluno {
        +UUID id
    }
    class Professor {
        +UUID id
    }
    class Instrumento {
        +UUID id
        +String nome
    }
    class Matricula {
        +UUID id
    }
    class Aula {
        +UUID id
        +LocalDate data
        +LocalTime horaInicio
        +String conteudo
        +String tarefaCasa
        +StatusAula status
    }
    class Frequencia {
        +UUID id
        +StatusPresenca status
        +String justificativa
    }
    class Material {
        +UUID id
        +String titulo
        +String arquivoUrl
    }
    class Pratica {
        +UUID id
        +int duracaoMin
        +int xpGanho
        +LocalDate data
    }
    class Progresso {
        +UUID id
        +int xpTotal
        +int nivel
        +int sequenciaDias
        +int tempoTotalMin
        +registrarPratica(Pratica)
        +calcularNivel() int
    }
    class Meta {
        +UUID id
        +String titulo
        +String tipo
        +int alvo
        +StatusMeta status
    }

    Usuario "*" -- "*" Role
    Role "*" -- "*" Permission
    Usuario "1" -- "*" RefreshToken
    Usuario "1" -- "1" Aluno
    Usuario "1" -- "1" Professor

    Aluno "1" -- "*" Matricula
    Professor "1" -- "*" Matricula
    Instrumento "1" -- "*" Matricula
    Professor "*" -- "*" Instrumento : ensina

    Matricula "1" -- "*" Aula
    Aula "1" -- "0..1" Frequencia
    Aluno "1" -- "*" Material : recebe
    Professor "1" -- "*" Material : envia

    Aluno "1" -- "*" Pratica
    Aluno "1" -- "1" Progresso
    Aluno "1" -- "*" Meta
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
    participant API as MeController
    participant UC as GamificacaoUseCase
    participant DOM as Domínio (cálculo XP)
    participant DB as PostgreSQL

    A->>C: informa duração + observação
    C->>API: POST /me/praticas
    API->>UC: registrarPratica(alunoId, duracaoMin)
    UC->>DB: salva Pratica (xpGanho)
    UC->>DB: carrega Progresso do aluno
    UC->>DOM: progresso.registrarPratica(pratica)
    DOM->>DOM: xpTotal += xp; nível = calcularNivel(); streak
    DOM-->>UC: progresso atualizado
    UC->>DB: salva Progresso
    UC-->>API: progresso (xp, nível, streak)
    API-->>C: 200 progresso atualizado
    C-->>A: feedback XP/nível
```

---

## 5. Sequência — Registrar frequência

RF14 + RN08/RN09: professor marca presença; ownership garante só alunos vinculados.

```mermaid
sequenceDiagram
    actor P as Professor
    participant C as App
    participant API as ProfessorController
    participant SEC as Spring Security (@PreAuthorize)
    participant UC as AulaUseCase
    participant DB as PostgreSQL

    P->>C: marca PRESENTE/FALTA/JUSTIFICADA
    C->>API: POST /professor/aulas/{id}/frequencia
    API->>SEC: hasAuthority('frequencia.manage')?
    SEC-->>API: ok
    API->>UC: registrarFrequencia(profId, aulaId, status)
    UC->>DB: carrega aula + matrícula
    UC->>UC: ownership: matricula.professor == profId? (RN12)
    alt não vinculado
        UC-->>API: 403 Forbidden
    else vinculado
        UC->>DB: salva/atualiza Frequencia
        UC-->>API: 200 frequência registrada
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
