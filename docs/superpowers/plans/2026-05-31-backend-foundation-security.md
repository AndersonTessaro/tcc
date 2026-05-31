# Backend — Fundação + Segurança — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend Spring Boot 4 / Java 25 que sobe, conecta no Postgres via Flyway, e expõe autenticação RBAC+PBAC completa (login, refresh, logout, me, recuperação de senha) com JWT RSA stateless.

**Architecture:** Clean Architecture pragmática (estilo marreh). Entidades JPA em `infrastructure`; domínio puro só para regras (aqui: hashing/expiração de refresh token). Use cases dependem de portas (Spring Data repositories). Spring Security 7 com Resource Server (JWT RSA), method security (`@PreAuthorize`).

**Tech Stack:** Java 25, Spring Boot 4.0, Maven, PostgreSQL, Flyway, Spring Security, oauth2-resource-server (Nimbus JOSE), BCrypt, Lombok, JUnit 5, Testcontainers, Spring Security Test.

---

## File Structure (locked-in decomposition)

```
backend/
├── pom.xml
├── docker-compose.yml                         # Postgres local
├── src/main/resources/
│   ├── application.yml
│   ├── certs/                                  # par RSA (gerado)
│   └── db/migration/
│       ├── V1__auth_schema.sql
│       └── V2__auth_seed.sql
├── src/main/java/br/com/harmonia/
│   ├── HarmoniaApplication.java
│   ├── domain/
│   │   └── security/
│   │       └── RefreshTokenHasher.java         # PURO: SHA-256 + expiração
│   ├── application/
│   │   └── security/
│   │       ├── AuthUseCase.java                # login/refresh/logout/me
│   │       ├── PasswordResetUseCase.java       # forgot/reset
│   │       └── port/
│   │           ├── UsuarioRepository.java
│   │           ├── RoleRepository.java
│   │           ├── PermissionRepository.java
│   │           ├── RefreshTokenRepository.java
│   │           └── PasswordResetTokenRepository.java
│   ├── infrastructure/
│   │   ├── persistence/
│   │   │   ├── common/BaseEntity.java
│   │   │   ├── security/
│   │   │   │   ├── Usuario.java  Role.java  Permission.java
│   │   │   │   ├── RefreshToken.java  PasswordResetToken.java
│   │   │   │   └── repository/                 # interfaces Spring Data = portas
│   │   │   └── ...
│   │   ├── security/
│   │   │   ├── SecurityConfig.java
│   │   │   ├── RsaKeyProperties.java
│   │   │   ├── JwtConfig.java                  # JwtEncoder/JwtDecoder
│   │   │   ├── TokenService.java               # gera access + refresh
│   │   │   ├── AppUserDetailsService.java
│   │   │   └── JwtAuthoritiesConverter.java
│   │   └── email/EmailSenderPort.java + LogEmailSender.java (dev)
│   └── presentation/
│       ├── auth/AuthController.java
│       ├── auth/dto/                           # Login/Refresh/Reset DTOs
│       └── error/GlobalExceptionHandler.java
└── src/test/java/br/com/harmonia/...
```

---

## Task 1: Scaffold do projeto Maven + Spring Boot 4

**Files:**
- Create: `backend/pom.xml`
- Create: `backend/docker-compose.yml`
- Create: `backend/src/main/resources/application.yml`
- Create: `backend/src/main/java/br/com/harmonia/HarmoniaApplication.java`
- Create: `backend/.gitignore`

- [ ] **Step 1: Criar `pom.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>4.0.0</version>
        <relativePath/>
    </parent>
    <groupId>br.com.harmonia</groupId>
    <artifactId>harmonia-backend</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <properties>
        <java.version>25</java.version>
    </properties>
    <dependencies>
        <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
        <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>
        <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-security</artifactId></dependency>
        <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-oauth2-resource-server</artifactId></dependency>
        <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-validation</artifactId></dependency>
        <dependency><groupId>org.flywaydb</groupId><artifactId>flyway-core</artifactId></dependency>
        <dependency><groupId>org.flywaydb</groupId><artifactId>flyway-database-postgresql</artifactId></dependency>
        <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId><scope>runtime</scope></dependency>
        <dependency><groupId>org.projectlombok</groupId><artifactId>lombok</artifactId><optional>true</optional></dependency>
        <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-test</artifactId><scope>test</scope></dependency>
        <dependency><groupId>org.springframework.security</groupId><artifactId>spring-security-test</artifactId><scope>test</scope></dependency>
        <dependency><groupId>org.testcontainers</groupId><artifactId>junit-jupiter</artifactId><scope>test</scope></dependency>
        <dependency><groupId>org.testcontainers</groupId><artifactId>postgresql</artifactId><scope>test</scope></dependency>
    </dependencies>
    <build>
        <plugins>
            <plugin><groupId>org.springframework.boot</groupId><artifactId>spring-boot-maven-plugin</artifactId>
                <configuration><excludes><exclude><groupId>org.projectlombok</groupId><artifactId>lombok</artifactId></exclude></excludes></configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

- [ ] **Step 2: Criar `docker-compose.yml` (Postgres dev)**

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: harmonia
      POSTGRES_USER: harmonia
      POSTGRES_PASSWORD: harmonia
    ports: ["5432:5432"]
    volumes: ["harmonia_pg:/var/lib/postgresql/data"]
volumes:
  harmonia_pg:
```

- [ ] **Step 3: Criar `application.yml`**

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/harmonia
    username: harmonia
    password: harmonia
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  flyway:
    enabled: true
app:
  rsa:
    private-key: classpath:certs/private.pem
    public-key: classpath:certs/public.pem
  jwt:
    access-ttl-minutes: 15
    refresh-ttl-days: 7
```

- [ ] **Step 4: Criar `HarmoniaApplication.java`**

```java
package br.com.harmonia;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class HarmoniaApplication {
    public static void main(String[] args) {
        SpringApplication.run(HarmoniaApplication.class, args);
    }
}
```

- [ ] **Step 5: Criar `.gitignore`**

```
target/
*.iml
.idea/
src/main/resources/certs/*.pem
```

- [ ] **Step 6: Subir Postgres e compilar**

Run: `cd backend && docker compose up -d && ./mvnw -q compile`
Expected: build sucesso. (Se não houver wrapper, rodar `mvn -q compile`.) Postgres ativo na 5432.

- [ ] **Step 7: Commit**

```bash
git add backend
git commit -m "chore(backend): scaffold Spring Boot 4 / Java 25 + Postgres + Flyway"
```

---

## Task 2: Migration de schema de autenticação (V1)

**Files:**
- Create: `backend/src/main/resources/db/migration/V1__auth_schema.sql`

- [ ] **Step 1: Criar `V1__auth_schema.sql`**

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE auth_role (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL
);

CREATE TABLE auth_permission (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL
);

CREATE TABLE auth_role_permissions (
    role_id        BIGINT NOT NULL REFERENCES auth_role(id) ON DELETE CASCADE,
    permissions_id BIGINT NOT NULL REFERENCES auth_permission(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permissions_id)
);

CREATE TABLE auth_user (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username       VARCHAR(100) NOT NULL UNIQUE,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password       VARCHAR(100) NOT NULL,
    display_name   VARCHAR(150),
    ativo          BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE auth_user_roles (
    user_id  UUID   NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    roles_id BIGINT NOT NULL REFERENCES auth_role(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, roles_id)
);

CREATE TABLE auth_refresh_token (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    user_id    UUID NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP
);
CREATE INDEX idx_refresh_token_hash ON auth_refresh_token(token_hash);

CREATE TABLE auth_password_reset_token (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    user_id    UUID NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    used       BOOLEAN NOT NULL DEFAULT FALSE
);
```

- [ ] **Step 2: Rodar app e verificar migration aplicada**

Run: `cd backend && ./mvnw spring-boot:run` (Ctrl+C após subir)
Expected: log Flyway "Successfully applied 1 migration"; tabelas `auth_*` criadas. Verificar: `docker compose exec db psql -U harmonia -d harmonia -c "\dt auth_*"`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/db/migration/V1__auth_schema.sql
git commit -m "feat(backend): V1 auth schema (user/role/permission/refresh/reset)"
```

---

## Task 3: Seed de roles, permissões e admin (V2)

**Files:**
- Create: `backend/src/main/resources/db/migration/V2__auth_seed.sql`

- [ ] **Step 1: Criar `V2__auth_seed.sql`** (hash BCrypt do admin gerado abaixo)

```sql
-- Roles
INSERT INTO auth_role(name, description) VALUES
  ('ADMIN','Acesso completo ao sistema'),
  ('PROFESSOR','Professor da escola'),
  ('ALUNO','Aluno da escola');

-- Permissions (catálogo dominio.acao)
INSERT INTO auth_permission(name, description) VALUES
  ('auth.user.manage','Gerenciar usuários'),
  ('auth.role.manage','Gerenciar roles'),
  ('auth.permission.manage','Gerenciar permissões'),
  ('aluno.read','Ler alunos'), ('aluno.manage','Gerenciar alunos'),
  ('professor.read','Ler professores'), ('professor.manage','Gerenciar professores'),
  ('matricula.manage','Gerenciar matrículas'),
  ('instrumento.manage','Gerenciar instrumentos'),
  ('turma.manage','Gerenciar turmas'),
  ('aula.read','Ler aulas'), ('aula.manage','Gerenciar aulas'),
  ('frequencia.manage','Registrar frequência'),
  ('material.read','Ler materiais'), ('material.manage','Gerenciar materiais'),
  ('meta.read','Ler metas'), ('meta.manage','Gerenciar metas'),
  ('pratica.register','Registrar prática'),
  ('progresso.read','Ler progresso'),
  ('financeiro.manage','Gerenciar financeiro'),
  ('relatorio.read','Ler relatórios'),
  ('config.manage','Gerenciar configurações');

-- ADMIN: todas
INSERT INTO auth_role_permissions(role_id, permissions_id)
SELECT (SELECT id FROM auth_role WHERE name='ADMIN'), p.id FROM auth_permission p;

-- PROFESSOR
INSERT INTO auth_role_permissions(role_id, permissions_id)
SELECT (SELECT id FROM auth_role WHERE name='PROFESSOR'), p.id FROM auth_permission p
WHERE p.name IN ('aluno.read','aula.read','aula.manage','frequencia.manage',
                 'material.read','material.manage','meta.read','meta.manage','relatorio.read');

-- ALUNO
INSERT INTO auth_role_permissions(role_id, permissions_id)
SELECT (SELECT id FROM auth_role WHERE name='ALUNO'), p.id FROM auth_permission p
WHERE p.name IN ('aula.read','material.read','meta.read','meta.manage',
                 'pratica.register','progresso.read');

-- Usuário admin inicial (senha: Admin@123 — TROCAR em prod)
INSERT INTO auth_user(username, email, password, display_name, ativo, email_verified)
VALUES ('admin','admin@harmonia.local',
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'Administrador', TRUE, TRUE);
INSERT INTO auth_user_roles(user_id, roles_id)
SELECT u.id, r.id FROM auth_user u, auth_role r WHERE u.username='admin' AND r.name='ADMIN';
```

> Hash é placeholder BCrypt de `Admin@123`. Gerar o real no Step 2 e substituir.

- [ ] **Step 2: Gerar hash BCrypt real de `Admin@123` e substituir no SQL**

Run: `cd backend && ./mvnw -q -Dexec.mainClass=... ` — ou usar utilitário rápido:
```bash
docker run --rm openjdk:25-slim sh -c "echo skip"   # se preferir, gerar via teste Java abaixo
```
Alternativa confiável — criar teste descartável que imprime o hash:
```java
// src/test/java/br/com/harmonia/GenHash.java  (apagar depois)
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
public class GenHash {
    public static void main(String[] a){ System.out.println(new BCryptPasswordEncoder().encode("Admin@123")); }
}
```
Run: `./mvnw -q compile exec:java -Dexec.classpathScope=test -Dexec.mainClass=br.com.harmonia.GenHash`
Copiar o hash impresso para o `password` do admin no V2. Apagar `GenHash.java`.

- [ ] **Step 3: Recriar o banco e rodar app**

Run: `cd backend && docker compose down -v && docker compose up -d && ./mvnw spring-boot:run` (Ctrl+C após subir)
Expected: Flyway aplica V1+V2. Verificar: `... psql ... -c "SELECT count(*) FROM auth_permission;"` → 22.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/db/migration/V2__auth_seed.sql
git commit -m "feat(backend): V2 seed roles/permissions + admin user"
```

---

## Task 4: Entidades JPA + repositórios (portas)

**Files:**
- Create: `infrastructure/persistence/common/BaseEntity.java`
- Create: `infrastructure/persistence/security/{Usuario,Role,Permission,RefreshToken,PasswordResetToken}.java`
- Create: `application/security/port/{UsuarioRepository,RoleRepository,PermissionRepository,RefreshTokenRepository,PasswordResetTokenRepository}.java`

- [ ] **Step 1: `BaseEntity.java`**

```java
package br.com.harmonia.infrastructure.persistence.common;

import jakarta.persistence.MappedSuperclass;

@MappedSuperclass
public abstract class BaseEntity {
}
```

- [ ] **Step 2: `Permission.java`**

```java
package br.com.harmonia.infrastructure.persistence.security;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "auth_permission")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Permission {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private String name;
    @Column(nullable = false)
    private String description;
}
```

- [ ] **Step 3: `Role.java`**

```java
package br.com.harmonia.infrastructure.persistence.security;

import jakarta.persistence.*;
import lombok.*;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity @Table(name = "auth_role")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Role {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private String name;
    @Column(nullable = false)
    private String description;
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "auth_role_permissions",
        joinColumns = @JoinColumn(name = "role_id"),
        inverseJoinColumns = @JoinColumn(name = "permissions_id"))
    private Set<Permission> permissions = new LinkedHashSet<>();
}
```

- [ ] **Step 4: `Usuario.java` (implementa `UserDetails`)**

```java
package br.com.harmonia.infrastructure.persistence.security;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Stream;

@Entity @Table(name = "auth_user")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Usuario implements UserDetails {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false, unique = true, updatable = false)
    private String username;
    @Column(nullable = false, unique = true)
    private String email;
    @Column(nullable = false)
    private String password;
    @Column(name = "display_name")
    private String displayName;
    @Column(nullable = false)
    private Boolean ativo = true;
    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = false;
    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm = LocalDateTime.now();

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "auth_user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "roles_id"))
    private Set<Role> roles = new LinkedHashSet<>();

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream()
            .flatMap(r -> Stream.concat(
                Stream.of(new SimpleGrantedAuthority("ROLE_" + r.getName())),
                r.getPermissions().stream().map(p -> new SimpleGrantedAuthority(p.getName()))))
            .distinct().toList();
    }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return ativo; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return ativo; }
}
```

- [ ] **Step 5: `RefreshToken.java` e `PasswordResetToken.java`**

```java
package br.com.harmonia.infrastructure.persistence.security;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name = "auth_refresh_token")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class RefreshToken {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;
    @ManyToOne(optional = false) @JoinColumn(name = "user_id")
    private Usuario user;
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;
    public boolean isRevoked() { return revokedAt != null; }
    public boolean isExpired() { return expiresAt.isBefore(LocalDateTime.now()); }
    public boolean isActive() { return !isRevoked() && !isExpired(); }
}
```

```java
package br.com.harmonia.infrastructure.persistence.security;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name = "auth_password_reset_token")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class PasswordResetToken {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;
    @ManyToOne(optional = false) @JoinColumn(name = "user_id")
    private Usuario user;
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
    @Column(nullable = false)
    private boolean used = false;
}
```

- [ ] **Step 6: Repositórios (portas Spring Data)**

```java
package br.com.harmonia.application.security.port;

import br.com.harmonia.infrastructure.persistence.security.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {
    Optional<Usuario> findByUsername(String username);
    Optional<Usuario> findByEmail(String email);
    Optional<Usuario> findByUsernameOrEmail(String username, String email);
}
```
```java
package br.com.harmonia.application.security.port;
import br.com.harmonia.infrastructure.persistence.security.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional; import java.util.UUID;
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);
}
```
```java
package br.com.harmonia.application.security.port;
import br.com.harmonia.infrastructure.persistence.security.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional; import java.util.UUID;
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);
}
```
```java
package br.com.harmonia.application.security.port;
import br.com.harmonia.infrastructure.persistence.security.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(String name);
}
```
```java
package br.com.harmonia.application.security.port;
import br.com.harmonia.infrastructure.persistence.security.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
public interface PermissionRepository extends JpaRepository<Permission, Long> { }
```

- [ ] **Step 7: Compilar e validar mapeamento contra o schema**

Run: `cd backend && ./mvnw -q spring-boot:run` (Ctrl+C após subir)
Expected: sobe sem erro (`ddl-auto: validate` confirma que entidades batem com as tabelas Flyway).

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java
git commit -m "feat(backend): JPA entities + repository ports for auth"
```

---

## Task 5: Domínio puro — `RefreshTokenHasher` (TDD)

**Files:**
- Create: `domain/security/RefreshTokenHasher.java`
- Test: `src/test/java/br/com/harmonia/domain/security/RefreshTokenHasherTest.java`

- [ ] **Step 1: Escrever o teste que falha**

```java
package br.com.harmonia.domain.security;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class RefreshTokenHasherTest {
    private final RefreshTokenHasher hasher = new RefreshTokenHasher();

    @Test
    void hash_isDeterministicAndHex64() {
        String h1 = hasher.sha256Hex("abc");
        String h2 = hasher.sha256Hex("abc");
        assertEquals(h1, h2);
        assertEquals(64, h1.length());
        assertTrue(h1.matches("[0-9a-f]{64}"));
    }

    @Test
    void hash_differsForDifferentInput() {
        assertNotEquals(hasher.sha256Hex("abc"), hasher.sha256Hex("abd"));
    }

    @Test
    void newOpaqueToken_isUrlSafeAndLongEnough() {
        String t = hasher.newOpaqueToken();
        assertTrue(t.length() >= 43);
        assertTrue(t.matches("[A-Za-z0-9_-]+"));
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && ./mvnw -q -Dtest=RefreshTokenHasherTest test`
Expected: FAIL — `RefreshTokenHasher` não existe / não compila.

- [ ] **Step 3: Implementar `RefreshTokenHasher` (puro, sem Spring)**

```java
package br.com.harmonia.domain.security;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

public class RefreshTokenHasher {
    private static final SecureRandom RANDOM = new SecureRandom();

    public String newOpaqueToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String sha256Hex(String raw) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(64);
            for (byte b : digest) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 indisponível", e);
        }
    }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && ./mvnw -q -Dtest=RefreshTokenHasherTest test`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/br/com/harmonia/domain backend/src/test
git commit -m "feat(backend): pure-domain RefreshTokenHasher with tests"
```

---

## Task 6: Chaves RSA + config JWT + Security

**Files:**
- Create: `backend/src/main/resources/certs/private.pem` + `public.pem` (gerados, fora do git)
- Create: `infrastructure/security/RsaKeyProperties.java`
- Create: `infrastructure/security/JwtConfig.java`
- Create: `infrastructure/security/AppUserDetailsService.java`
- Create: `infrastructure/security/SecurityConfig.java`

- [ ] **Step 1: Gerar par RSA**

Run:
```bash
cd backend/src/main/resources/certs
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in private.pem -out public.pem
```
Expected: `private.pem` e `public.pem` criados. (Já ignorados pelo `.gitignore`.)

- [ ] **Step 2: `RsaKeyProperties`**

```java
package br.com.harmonia.infrastructure.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;

@ConfigurationProperties(prefix = "app.rsa")
public record RsaKeyProperties(RSAPublicKey publicKey, RSAPrivateKey privateKey) {}
```

- [ ] **Step 3: `JwtConfig` (encoder + decoder)**

```java
package br.com.harmonia.infrastructure.security;

import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.JWKSet;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jwt.*;

@Configuration
public class JwtConfig {
    private final RsaKeyProperties keys;
    public JwtConfig(RsaKeyProperties keys) { this.keys = keys; }

    @Bean
    JwtDecoder jwtDecoder() {
        return NimbusJwtDecoder.withPublicKey(keys.publicKey()).build();
    }

    @Bean
    JwtEncoder jwtEncoder() {
        var jwk = new RSAKey.Builder(keys.publicKey()).privateKey(keys.privateKey()).build();
        return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(jwk)));
    }
}
```

- [ ] **Step 4: `AppUserDetailsService`**

```java
package br.com.harmonia.infrastructure.security;

import br.com.harmonia.application.security.port.UsuarioRepository;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

@Service
public class AppUserDetailsService implements UserDetailsService {
    private final UsuarioRepository usuarios;
    public AppUserDetailsService(UsuarioRepository usuarios) { this.usuarios = usuarios; }

    @Override
    public UserDetails loadUserByUsername(String login) throws UsernameNotFoundException {
        return usuarios.findByUsernameOrEmail(login, login)
            .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado"));
    }
}
```

- [ ] **Step 5: `SecurityConfig` (stateless, resource server, method security)**

```java
package br.com.harmonia.infrastructure.security;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.*;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableMethodSecurity
@EnableConfigurationProperties(RsaKeyProperties.class)
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean
    AuthenticationManager authenticationManager(UserDetailsService uds, PasswordEncoder enc) {
        var provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(uds);
        provider.setPasswordEncoder(enc);
        return new ProviderManager(provider);
    }

    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter() {
        var authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthorityPrefix("");          // claim já traz "ROLE_x" e permissões
        authorities.setAuthoritiesClaimName("authorities");
        var converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        return converter;
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationConverter conv) throws Exception {
        http
            .csrf(c -> c.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/auth/login", "/auth/refresh",
                                 "/auth/forgot-password", "/auth/reset-password").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(conv)));
        return http.build();
    }
}
```

- [ ] **Step 6: Compilar e subir**

Run: `cd backend && ./mvnw -q spring-boot:run` (Ctrl+C após subir)
Expected: sobe sem erro; bean `JwtEncoder`/`JwtDecoder` criados a partir do PEM.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/br/com/harmonia/infrastructure/security
git commit -m "feat(backend): RSA JWT config + stateless security + method security"
```

---

## Task 7: `TokenService` + `AuthUseCase` + `AuthController` (login/refresh/logout/me)

**Files:**
- Create: `infrastructure/security/TokenService.java`
- Create: `application/security/AuthUseCase.java`
- Create: `presentation/auth/dto/*.java`
- Create: `presentation/auth/AuthController.java`
- Test: `src/test/java/br/com/harmonia/auth/AuthFlowIT.java`

- [ ] **Step 1: DTOs**

```java
package br.com.harmonia.presentation.auth.dto;
import jakarta.validation.constraints.NotBlank;
public record LoginRequest(@NotBlank String login, @NotBlank String senha) {}
```
```java
package br.com.harmonia.presentation.auth.dto;
import jakarta.validation.constraints.NotBlank;
public record RefreshRequest(@NotBlank String refreshToken) {}
```
```java
package br.com.harmonia.presentation.auth.dto;
import java.util.List;
public record AuthResponse(String accessToken, String refreshToken,
                           String username, List<String> authorities) {}
```

- [ ] **Step 2: `TokenService` (gera access JWT + cria/rotaciona refresh)**

```java
package br.com.harmonia.infrastructure.security;

import br.com.harmonia.application.security.port.RefreshTokenRepository;
import br.com.harmonia.domain.security.RefreshTokenHasher;
import br.com.harmonia.infrastructure.persistence.security.RefreshToken;
import br.com.harmonia.infrastructure.persistence.security.Usuario;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

import java.time.*;
import java.util.List;

@Service
public class TokenService {
    private final JwtEncoder encoder;
    private final RefreshTokenRepository refreshTokens;
    private final RefreshTokenHasher hasher = new RefreshTokenHasher();
    private final long accessTtlMinutes;
    private final long refreshTtlDays;

    public TokenService(JwtEncoder encoder, RefreshTokenRepository refreshTokens,
                        @Value("${app.jwt.access-ttl-minutes}") long accessTtlMinutes,
                        @Value("${app.jwt.refresh-ttl-days}") long refreshTtlDays) {
        this.encoder = encoder; this.refreshTokens = refreshTokens;
        this.accessTtlMinutes = accessTtlMinutes; this.refreshTtlDays = refreshTtlDays;
    }

    public String generateAccessToken(UserDetails user) {
        Instant now = Instant.now();
        List<String> authorities = user.getAuthorities().stream()
            .map(a -> a.getAuthority()).toList();
        var claims = JwtClaimsSet.builder()
            .issuer("harmonia").issuedAt(now)
            .expiresAt(now.plus(Duration.ofMinutes(accessTtlMinutes)))
            .subject(user.getUsername())
            .claim("authorities", authorities)
            .build();
        return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }

    /** Cria refresh token, persiste só o hash, devolve o valor cru. */
    public String issueRefreshToken(Usuario user) {
        String raw = hasher.newOpaqueToken();
        RefreshToken rt = new RefreshToken();
        rt.setTokenHash(hasher.sha256Hex(raw));
        rt.setUser(user);
        rt.setExpiresAt(LocalDateTime.now().plusDays(refreshTtlDays));
        refreshTokens.save(rt);
        return raw;
    }

    public RefreshToken validateRefreshToken(String raw) {
        RefreshToken rt = refreshTokens.findByTokenHash(hasher.sha256Hex(raw))
            .orElseThrow(() -> new BadRefreshTokenException("Refresh token inválido"));
        if (!rt.isActive()) throw new BadRefreshTokenException("Refresh token expirado ou revogado");
        return rt;
    }

    public void revoke(RefreshToken rt) {
        rt.setRevokedAt(LocalDateTime.now());
        refreshTokens.save(rt);
    }

    public static class BadRefreshTokenException extends RuntimeException {
        public BadRefreshTokenException(String m) { super(m); }
    }
}
```

- [ ] **Step 3: `AuthUseCase`**

```java
package br.com.harmonia.application.security;

import br.com.harmonia.application.security.port.UsuarioRepository;
import br.com.harmonia.infrastructure.persistence.security.RefreshToken;
import br.com.harmonia.infrastructure.persistence.security.Usuario;
import br.com.harmonia.infrastructure.security.TokenService;
import br.com.harmonia.presentation.auth.dto.AuthResponse;
import org.springframework.security.authentication.*;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AuthUseCase {
    private final AuthenticationManager authManager;
    private final TokenService tokens;
    private final UsuarioRepository usuarios;

    public AuthUseCase(AuthenticationManager authManager, TokenService tokens, UsuarioRepository usuarios) {
        this.authManager = authManager; this.tokens = tokens; this.usuarios = usuarios;
    }

    @Transactional
    public AuthResponse login(String login, String senha) {
        var auth = authManager.authenticate(new UsernamePasswordAuthenticationToken(login, senha));
        UserDetails user = (UserDetails) auth.getPrincipal();
        Usuario usuario = usuarios.findByUsernameOrEmail(user.getUsername(), user.getUsername()).orElseThrow();
        return build(user, usuario, tokens.issueRefreshToken(usuario));
    }

    @Transactional
    public AuthResponse refresh(String rawRefresh) {
        RefreshToken rt = tokens.validateRefreshToken(rawRefresh);
        tokens.revoke(rt);                          // rotação
        Usuario usuario = rt.getUser();
        return build(usuario, usuario, tokens.issueRefreshToken(usuario));
    }

    @Transactional
    public void logout(String rawRefresh) {
        tokens.revoke(tokens.validateRefreshToken(rawRefresh));
    }

    private AuthResponse build(UserDetails user, Usuario usuario, String refresh) {
        List<String> auths = user.getAuthorities().stream().map(a -> a.getAuthority()).toList();
        return new AuthResponse(tokens.generateAccessToken(user), refresh, usuario.getUsername(), auths);
    }
}
```

- [ ] **Step 4: `AuthController`**

```java
package br.com.harmonia.presentation.auth;

import br.com.harmonia.application.security.AuthUseCase;
import br.com.harmonia.application.security.port.UsuarioRepository;
import br.com.harmonia.presentation.auth.dto.*;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthUseCase auth;
    private final UsuarioRepository usuarios;
    public AuthController(AuthUseCase auth, UsuarioRepository usuarios) { this.auth = auth; this.usuarios = usuarios; }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req.login(), req.senha());
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest req) {
        return auth.refresh(req.refreshToken());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody RefreshRequest req) {
        auth.logout(req.refreshToken());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public Map<String, Object> me(@AuthenticationPrincipal Jwt jwt) {
        var usuario = usuarios.findByUsername(jwt.getSubject()).orElseThrow();
        return Map.of(
            "username", usuario.getUsername(),
            "email", usuario.getEmail(),
            "displayName", usuario.getDisplayName(),
            "authorities", jwt.getClaimAsStringList("authorities"));
    }
}
```

- [ ] **Step 5: Teste de integração do fluxo (Testcontainers)**

```java
package br.com.harmonia.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class AuthFlowIT {
    @Container static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:16");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", pg::getJdbcUrl);
        r.add("spring.datasource.username", pg::getUsername);
        r.add("spring.datasource.password", pg::getPassword);
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;

    @Test
    void login_then_me_then_refresh() throws Exception {
        // login com admin do seed
        String body = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"admin\",\"senha\":\"Admin@123\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken", not(emptyString())))
            .andExpect(jsonPath("$.authorities", hasItem("ROLE_ADMIN")))
            .andReturn().getResponse().getContentAsString();
        JsonNode json = om.readTree(body);
        String access = json.get("accessToken").asText();
        String refresh = json.get("refreshToken").asText();

        // /auth/me autenticado
        mvc.perform(get("/auth/me").header("Authorization", "Bearer " + access))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.username", is("admin")));

        // refresh rotaciona
        mvc.perform(post("/auth/refresh").contentType("application/json")
                .content("{\"refreshToken\":\"" + refresh + "\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken", not(emptyString())));

        // refresh antigo agora inválido (rotacionado)
        mvc.perform(post("/auth/refresh").contentType("application/json")
                .content("{\"refreshToken\":\"" + refresh + "\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void me_withoutToken_is401() throws Exception {
        mvc.perform(get("/auth/me")).andExpect(status().isUnauthorized());
    }
}
```

> Requer o handler do Task 8 para mapear `BadRefreshTokenException` → 401. Implementar Task 8 antes de rodar o sub-teste de refresh inválido, ou rodar só `login_then_me` primeiro.

- [ ] **Step 6: Rodar testes**

Run: `cd backend && ./mvnw -q -Dtest=AuthFlowIT test`
Expected: PASS após Task 8 (handler de erro). `login_then_me` já passa.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/br/com/harmonia/{infrastructure/security/TokenService.java,application/security/AuthUseCase.java,presentation/auth} backend/src/test
git commit -m "feat(backend): login/refresh/logout/me with RSA JWT + rotation"
```

---

## Task 8: Tratamento de erros global

**Files:**
- Create: `presentation/error/ApiError.java`
- Create: `presentation/error/GlobalExceptionHandler.java`

- [ ] **Step 1: `ApiError`**

```java
package br.com.harmonia.presentation.error;
import java.time.Instant;
import java.util.List;
public record ApiError(Instant timestamp, int status, String code, String message, List<String> fields) {}
```

- [ ] **Step 2: `GlobalExceptionHandler`**

```java
package br.com.harmonia.presentation.error;

import br.com.harmonia.infrastructure.security.TokenService.BadRefreshTokenException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiError> badCredentials(BadCredentialsException e) {
        return build(HttpStatus.UNAUTHORIZED, "BAD_CREDENTIALS", "Login ou senha inválidos", List.of());
    }

    @ExceptionHandler(BadRefreshTokenException.class)
    public ResponseEntity<ApiError> badRefresh(BadRefreshTokenException e) {
        return build(HttpStatus.UNAUTHORIZED, "BAD_REFRESH_TOKEN", e.getMessage(), List.of());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> denied(AccessDeniedException e) {
        return build(HttpStatus.FORBIDDEN, "ACCESS_DENIED", "Sem permissão", List.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> validation(MethodArgumentNotValidException e) {
        var fields = e.getBindingResult().getFieldErrors().stream()
            .map(f -> f.getField() + ": " + f.getDefaultMessage()).toList();
        return build(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION", "Dados inválidos", fields);
    }

    private ResponseEntity<ApiError> build(HttpStatus st, String code, String msg, List<String> fields) {
        return ResponseEntity.status(st).body(new ApiError(Instant.now(), st.value(), code, msg, fields));
    }
}
```

- [ ] **Step 3: Rodar suíte completa de auth**

Run: `cd backend && ./mvnw -q test`
Expected: PASS — `AuthFlowIT` (incl. refresh inválido → 401) e `RefreshTokenHasherTest` verdes.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/br/com/harmonia/presentation/error
git commit -m "feat(backend): global exception handler (401/403/422)"
```

---

## Task 9: Recuperação de senha (RF02) — forgot/reset

**Files:**
- Create: `infrastructure/email/EmailSenderPort.java` + `LogEmailSender.java`
- Create: `application/security/PasswordResetUseCase.java`
- Modify: `presentation/auth/AuthController.java` (2 endpoints) + DTOs
- Test: `src/test/java/br/com/harmonia/auth/PasswordResetIT.java`

- [ ] **Step 1: Porta de e-mail + impl dev (log)**

```java
package br.com.harmonia.infrastructure.email;
public interface EmailSenderPort {
    void send(String to, String subject, String body);
}
```
```java
package br.com.harmonia.infrastructure.email;
import org.slf4j.*;
import org.springframework.stereotype.Component;
@Component
public class LogEmailSender implements EmailSenderPort {
    private static final Logger log = LoggerFactory.getLogger(LogEmailSender.class);
    @Override public void send(String to, String subject, String body) {
        log.info("EMAIL -> {} | {} | {}", to, subject, body);
    }
}
```

- [ ] **Step 2: DTOs**

```java
package br.com.harmonia.presentation.auth.dto;
import jakarta.validation.constraints.*;
public record ForgotPasswordRequest(@NotBlank @Email String email) {}
```
```java
package br.com.harmonia.presentation.auth.dto;
import jakarta.validation.constraints.*;
public record ResetPasswordRequest(@NotBlank String token, @NotBlank @Size(min = 8) String novaSenha) {}
```

- [ ] **Step 3: `PasswordResetUseCase`**

```java
package br.com.harmonia.application.security;

import br.com.harmonia.application.security.port.*;
import br.com.harmonia.domain.security.RefreshTokenHasher;
import br.com.harmonia.infrastructure.email.EmailSenderPort;
import br.com.harmonia.infrastructure.persistence.security.PasswordResetToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class PasswordResetUseCase {
    private final UsuarioRepository usuarios;
    private final PasswordResetTokenRepository tokens;
    private final EmailSenderPort email;
    private final PasswordEncoder encoder;
    private final RefreshTokenHasher hasher = new RefreshTokenHasher();

    public PasswordResetUseCase(UsuarioRepository usuarios, PasswordResetTokenRepository tokens,
                                EmailSenderPort email, PasswordEncoder encoder) {
        this.usuarios = usuarios; this.tokens = tokens; this.email = email; this.encoder = encoder;
    }

    @Transactional
    public void forgot(String emailAddr) {
        usuarios.findByEmail(emailAddr).ifPresent(user -> {
            String raw = hasher.newOpaqueToken();
            PasswordResetToken prt = new PasswordResetToken();
            prt.setTokenHash(hasher.sha256Hex(raw));
            prt.setUser(user);
            prt.setExpiresAt(LocalDateTime.now().plusMinutes(30));
            tokens.save(prt);
            email.send(user.getEmail(), "Recuperação de senha",
                "Use este token para redefinir sua senha: " + raw);
        });
        // resposta sempre 204 — não revela se e-mail existe
    }

    @Transactional
    public void reset(String rawToken, String novaSenha) {
        PasswordResetToken prt = tokens.findByTokenHash(hasher.sha256Hex(rawToken))
            .orElseThrow(() -> new InvalidResetTokenException("Token inválido"));
        if (prt.isUsed() || prt.getExpiresAt().isBefore(LocalDateTime.now()))
            throw new InvalidResetTokenException("Token expirado ou já usado");
        var user = prt.getUser();
        user.setPassword(encoder.encode(novaSenha));
        usuarios.save(user);
        prt.setUsed(true);
        tokens.save(prt);
    }

    public static class InvalidResetTokenException extends RuntimeException {
        public InvalidResetTokenException(String m) { super(m); }
    }
}
```

- [ ] **Step 4: Endpoints no `AuthController`** (adicionar)

```java
// injetar PasswordResetUseCase no construtor; adicionar:
@org.springframework.web.bind.annotation.PostMapping("/forgot-password")
public org.springframework.http.ResponseEntity<Void> forgot(
        @jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody
        br.com.harmonia.presentation.auth.dto.ForgotPasswordRequest req) {
    reset.forgot(req.email());
    return org.springframework.http.ResponseEntity.noContent().build();
}

@org.springframework.web.bind.annotation.PostMapping("/reset-password")
public org.springframework.http.ResponseEntity<Void> reset(
        @jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody
        br.com.harmonia.presentation.auth.dto.ResetPasswordRequest req) {
    reset.reset(req.token(), req.novaSenha());
    return org.springframework.http.ResponseEntity.noContent().build();
}
```

- [ ] **Step 5: Mapear `InvalidResetTokenException` no handler** (adicionar em `GlobalExceptionHandler`)

```java
@ExceptionHandler(br.com.harmonia.application.security.PasswordResetUseCase.InvalidResetTokenException.class)
public ResponseEntity<ApiError> invalidReset(
        br.com.harmonia.application.security.PasswordResetUseCase.InvalidResetTokenException e) {
    return build(HttpStatus.BAD_REQUEST, "INVALID_RESET_TOKEN", e.getMessage(), List.of());
}
```

- [ ] **Step 6: Teste de integração**

```java
package br.com.harmonia.auth;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @Testcontainers
class PasswordResetIT {
    @Container static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:16");
    @DynamicPropertySource static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", pg::getJdbcUrl);
        r.add("spring.datasource.username", pg::getUsername);
        r.add("spring.datasource.password", pg::getPassword);
    }
    @Autowired MockMvc mvc;

    @Test
    void forgot_unknownEmail_still204() throws Exception {
        mvc.perform(post("/auth/forgot-password").contentType("application/json")
                .content("{\"email\":\"naoexiste@x.com\"}"))
            .andExpect(status().isNoContent());
    }

    @Test
    void reset_invalidToken_is400() throws Exception {
        mvc.perform(post("/auth/reset-password").contentType("application/json")
                .content("{\"token\":\"xxx\",\"novaSenha\":\"NovaSenha1\"}"))
            .andExpect(status().isBadRequest());
    }
}
```

- [ ] **Step 7: Rodar e commitar**

Run: `cd backend && ./mvnw -q test`
Expected: PASS (todos os ITs + unit).
```bash
git add backend
git commit -m "feat(backend): password recovery (forgot/reset) with token + email port"
```

---

## Task 10: Endpoint protegido de exemplo + verificação RBAC/PBAC

**Files:**
- Create: `presentation/ping/SecurePingController.java`
- Test: `src/test/java/br/com/harmonia/security/AuthorizationIT.java`

- [ ] **Step 1: Controller com `@PreAuthorize`**

```java
package br.com.harmonia.presentation.ping;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/admin")
public class SecurePingController {
    @GetMapping("/ping")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('auth.user.manage')")
    public Map<String, String> ping() {
        return Map.of("status", "ok");
    }
}
```

- [ ] **Step 2: Teste — admin acessa, sem token 401, token sem permissão 403**

```java
package br.com.harmonia.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @Testcontainers
class AuthorizationIT {
    @Container static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:16");
    @DynamicPropertySource static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", pg::getJdbcUrl);
        r.add("spring.datasource.username", pg::getUsername);
        r.add("spring.datasource.password", pg::getPassword);
    }
    @Autowired MockMvc mvc; @Autowired ObjectMapper om;

    private String loginAdmin() throws Exception {
        String body = mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"login\":\"admin\",\"senha\":\"Admin@123\"}"))
            .andReturn().getResponse().getContentAsString();
        return om.readTree(body).get("accessToken").asText();
    }

    @Test
    void admin_canAccess() throws Exception {
        mvc.perform(get("/admin/ping").header("Authorization", "Bearer " + loginAdmin()))
            .andExpect(status().isOk());
    }

    @Test
    void noToken_is401() throws Exception {
        mvc.perform(get("/admin/ping")).andExpect(status().isUnauthorized());
    }
}
```

- [ ] **Step 3: Rodar a suíte completa**

Run: `cd backend && ./mvnw test`
Expected: PASS — todos os testes verdes. Build limpo.

- [ ] **Step 4: Commit**

```bash
git add backend
git commit -m "test(backend): RBAC/PBAC authorization integration + secure ping"
```

---

## Self-Review (cobertura vs spec)

- **RF01 login** → Task 7. **RF02 recuperar senha** → Task 9. ✅
- **RBAC+PBAC** (Usuario/Role/Permission, @PreAuthorize) → Tasks 2,3,4,10. ✅
- **JWT RSA + refresh + rotação + revogação** → Tasks 6,7. ✅
- **Seed roles/permissões/admin** → Task 3. ✅
- **Stateless, BCrypt** → Task 6. ✅
- **Storage / ownership / domínio de negócio** → fora deste plano (Plano 2). ✅ (escopo correto)
- Placeholders: nenhum — todo passo tem código/comando concreto.
- Consistência de tipos: `RefreshTokenHasher`, `TokenService.BadRefreshTokenException`,
  `PasswordResetUseCase.InvalidResetTokenException`, DTOs e portas usados de forma idêntica entre tasks.

## Dependências entre planos
- **Plano 2** (domínio + endpoints) assume: entidades de auth, `Usuario`, portas, `@PreAuthorize`, padrão de erro e Testcontainers já existentes aqui.
- Perfis Aluno/Professor (tabelas 1:1) entram no Plano 2, referenciando `auth_user`.
