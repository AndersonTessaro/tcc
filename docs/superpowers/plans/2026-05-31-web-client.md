# Web Client (React) — Aluno + Professor + Configurador Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cliente web React que espelha o app mobile (Aluno + Professor) **e** adiciona o Configurador Admin (gestão de usuários, roles, permissões, config). Consome a mesma API REST do backend.

**Architecture:** SPA React + Vite + TypeScript (padrão herdado do `marreh-intranet`). React Router 6, Tailwind + shadcn/ui, cliente fetch com JWT access+refresh em `localStorage`. Camadas por feature: `pages`, `services` (única porta de rede), `hooks`, `components`.

**Tech Stack:** React 18, Vite, TypeScript, React Router 6, Tailwind CSS, shadcn/ui (Radix), Sonner (toasts), Vitest + Testing Library.

**Pré-requisito:** Backend Planos 1+2. **Esta é fase pós-MVP** (maior escopo — paridade web completa).

**Escopo:** paridade total com o mobile + Admin. Aluno e Professor têm na web tudo que têm no app (mesmos endpoints `/me/*` e `/professor/*`). Admin é exclusivo da web.

---

## File Structure

```
web/
├── index.html  vite.config.ts  tailwind.config.js  tsconfig.json  package.json
├── .env                                   # VITE_API_BASE_URL
└── src/
    ├── main.tsx  App.tsx                   # router + providers
    ├── lib/http/                           # apiClient, authStorage, authEvents
    ├── features/
    │   ├── auth/                           # useAuth, authService, ProtectedRoute
    │   ├── aluno/   services + pages
    │   ├── professor/ services + pages
    │   └── admin/   services + pages (Configurador)
    ├── components/                         # shadcn/ui + layout (Sidebar, Topbar)
    └── routes/                             # definição de rotas por papel
```

---

## Task 1 (Backend): endpoints do Configurador de Segurança

> O Configurador web precisa gerenciar usuários/roles/permissões — endpoints ausentes nos Planos 1-2. Adicionar aqui (estilo `SecurityAdminController` do marreh).

**Files:** `application/admin/SecurityAdminUseCase.java`, `presentation/admin/SecurityAdminController.java` + DTOs. Test: `SecurityAdminIT`.

- [ ] **Step 1: `SecurityAdminUseCase`**

```java
package br.com.harmonia.application.admin;

import br.com.harmonia.application.security.port.*;
import br.com.harmonia.infrastructure.persistence.security.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class SecurityAdminUseCase {
    private final UsuarioRepository usuarios; private final RoleRepository roles;
    private final PermissionRepository permissions; private final PasswordEncoder encoder;
    public SecurityAdminUseCase(UsuarioRepository u, RoleRepository r, PermissionRepository p, PasswordEncoder e){
        this.usuarios=u; this.roles=r; this.permissions=p; this.encoder=e; }

    public List<Usuario> listarUsuarios() { return usuarios.findAll(); }
    public List<Role> listarRoles() { return roles.findAll(); }
    public List<Permission> listarPermissoes() { return permissions.findAll(); }

    @Transactional
    public Usuario definirRoles(UUID userId, Set<Long> roleIds) {
        Usuario u = usuarios.findById(userId).orElseThrow();
        u.setRoles(new LinkedHashSet<>(roles.findAllById(roleIds)));
        return usuarios.save(u);
    }
    @Transactional
    public void definirStatus(UUID userId, boolean ativo) {
        Usuario u = usuarios.findById(userId).orElseThrow();
        u.setAtivo(ativo); usuarios.save(u);
    }
    @Transactional
    public void resetarSenha(UUID userId, String novaSenha) {
        Usuario u = usuarios.findById(userId).orElseThrow();
        u.setPassword(encoder.encode(novaSenha)); usuarios.save(u);
    }
    @Transactional
    public Role definirPermissoesDaRole(Long roleId, Set<Long> permIds) {
        Role r = roles.findById(roleId).orElseThrow();
        r.setPermissions(new LinkedHashSet<>(permissions.findAllById(permIds)));
        return roles.save(r);
    }
    @Transactional
    public Role criarRole(String name, String description) {
        Role r = new Role(); r.setName(name); r.setDescription(description);
        return roles.save(r);
    }
}
```

- [ ] **Step 2: `SecurityAdminController`** (guard `auth.*.manage`)

```java
package br.com.harmonia.presentation.admin;

import br.com.harmonia.application.admin.SecurityAdminUseCase;
import br.com.harmonia.infrastructure.persistence.security.*;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/admin/security")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('auth.user.manage') or hasAuthority('auth.role.manage')")
public class SecurityAdminController {
    private final SecurityAdminUseCase uc;
    public SecurityAdminController(SecurityAdminUseCase uc) { this.uc = uc; }

    public record SetRoles(@NotNull Set<Long> roleIds) {}
    public record SetStatus(boolean ativo) {}
    public record ResetSenha(@NotBlank @Size(min=8) String novaSenha) {}
    public record SetPerms(@NotNull Set<Long> permissionIds) {}
    public record NovaRole(@NotBlank String name, @NotBlank String description) {}

    @GetMapping("/usuarios") public List<Usuario> usuarios() { return uc.listarUsuarios(); }
    @GetMapping("/roles") public List<Role> roles() { return uc.listarRoles(); }
    @GetMapping("/permissoes") public List<Permission> permissoes() { return uc.listarPermissoes(); }

    @PutMapping("/usuarios/{id}/roles") @PreAuthorize("hasAuthority('auth.user.manage')")
    public Usuario setRoles(@PathVariable UUID id, @RequestBody @jakarta.validation.Valid SetRoles r) {
        return uc.definirRoles(id, r.roleIds()); }

    @PutMapping("/usuarios/{id}/status") @PreAuthorize("hasAuthority('auth.user.manage')")
    public void setStatus(@PathVariable UUID id, @RequestBody SetStatus r) { uc.definirStatus(id, r.ativo()); }

    @PutMapping("/usuarios/{id}/senha") @PreAuthorize("hasAuthority('auth.user.manage')")
    public void resetSenha(@PathVariable UUID id, @RequestBody @jakarta.validation.Valid ResetSenha r) {
        uc.resetarSenha(id, r.novaSenha()); }

    @PostMapping("/roles") @PreAuthorize("hasAuthority('auth.role.manage')")
    public Role criarRole(@RequestBody @jakarta.validation.Valid NovaRole r) {
        return uc.criarRole(r.name(), r.description()); }

    @PutMapping("/roles/{id}/permissoes") @PreAuthorize("hasAuthority('auth.role.manage')")
    public Role setPerms(@PathVariable Long id, @RequestBody @jakarta.validation.Valid SetPerms r) {
        return uc.definirPermissoesDaRole(id, r.permissionIds()); }
}
```

- [ ] **Step 3: Teste IT** — `SecurityAdminIT` (Testcontainers, padrão Plano 1): login admin → `GET /admin/security/usuarios|roles|permissoes` 200; criar role; setar permissões; setar roles de um usuário; usuário sem `auth.*` → 403.

- [ ] **Step 4: Rodar e commitar** — `cd backend && ./mvnw -q test` → PASS. `git commit -am "feat(backend): security admin endpoints (users/roles/permissions management)"`

---

## Task 2: Scaffold web (Vite + React + TS + Tailwind + shadcn)

**Files:** projeto `web/` gerado, `tailwind.config.js`, `.env`, `src/App.tsx`, `src/main.tsx`.

- [ ] **Step 1: Criar projeto**

```bash
cd C:/Codding/Fag/tcc_anderson
npm create vite@latest web -- --template react-ts
cd web && npm i
npm i react-router-dom sonner
npm i -D tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom jsdom
npx tailwindcss init -p
npx shadcn@latest init    # estilo neutro; aceitar defaults
```

- [ ] **Step 2: `tailwind.config.js` + `src/index.css`** (content paths + tokens; alinhar cores ao Figma/marreh)

```js
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { primary: "#6C5CE7", accent: "#00B894" } } },
  plugins: [],
};
```

- [ ] **Step 3: `.env`** — `VITE_API_BASE_URL=http://localhost:8080`

- [ ] **Step 4: Vitest config** — `vite.config.ts` adicionar `test: { environment: "jsdom", globals: true }`.

- [ ] **Step 5: Subir** — `npm run dev` → app abre. Expected: página default + Tailwind ativo.
- [ ] **Step 6: Commit** — `git add web && git commit -m "chore(web): scaffold Vite React TS + Tailwind + shadcn"`

---

## Task 3: Cliente HTTP com JWT (refresh) — TDD

**Files:** `src/lib/http/{authStorage,authEvents,apiClient}.ts`. Test: `src/lib/http/apiClient.test.ts`.

> Mesma lógica do mobile (Plano 3 Task 2), mas storage em `localStorage` (web) — padrão marreh-intranet.

- [ ] **Step 1: `authStorage` + `authEvents`**

```ts
// src/lib/http/authStorage.ts
const ACCESS = "harmonia_access", REFRESH = "harmonia_refresh";
export const authStorage = {
  get: () => ({ access: localStorage.getItem(ACCESS), refresh: localStorage.getItem(REFRESH) }),
  set: (a: string, r: string) => { localStorage.setItem(ACCESS, a); localStorage.setItem(REFRESH, r); },
  clear: () => { localStorage.removeItem(ACCESS); localStorage.removeItem(REFRESH); },
};
```
```ts
// src/lib/http/authEvents.ts
type L = () => void; const ls = new Set<L>();
export const authEvents = { onLogout: (l: L) => { ls.add(l); return () => ls.delete(l); }, emitLogout: () => ls.forEach(l => l()) };
```

- [ ] **Step 2: Teste que falha** (refresh no 401, logout quando refresh falha)

```ts
// src/lib/http/apiClient.test.ts
import { describe, it, expect, vi } from "vitest";
import { createApiClient } from "./apiClient";
const json = (status: number, body: any) => Promise.resolve({ status, ok: status < 400, json: () => Promise.resolve(body) } as Response);

describe("apiClient", () => {
  const store = { access: "a1", refresh: "r1" };
  const deps = {
    baseUrl: "http://x", getTokens: () => store,
    setTokens: (a: string, r: string) => { store.access = a; store.refresh = r; },
    clearTokens: () => { store.access = ""; store.refresh = ""; },
    onAuthFailure: vi.fn(),
  };
  it("retries after 401 with refreshed token", async () => {
    const f = vi.fn().mockReturnValueOnce(json(401, {})).mockReturnValueOnce(json(200, { accessToken: "a2", refreshToken: "r2" })).mockReturnValueOnce(json(200, { ok: true }));
    const api = createApiClient({ ...deps, fetchFn: f as any });
    expect(await api.get("/me/dashboard")).toEqual({ ok: true });
    expect(store.access).toBe("a2");
  });
  it("logs out when refresh fails", async () => {
    store.access = "a1"; store.refresh = "r1";
    const f = vi.fn().mockReturnValueOnce(json(401, {})).mockReturnValueOnce(json(401, {}));
    const api = createApiClient({ ...deps, fetchFn: f as any });
    await expect(api.get("/me/dashboard")).rejects.toBeTruthy();
    expect(deps.onAuthFailure).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Rodar e falhar** — `cd web && npx vitest run apiClient` → FAIL.

- [ ] **Step 4: Implementar `apiClient`** (síncrono no storage; estrutura igual ao mobile)

```ts
// src/lib/http/apiClient.ts
type Tokens = { access: string | null; refresh: string | null };
type Deps = { baseUrl: string; getTokens: () => Tokens; setTokens: (a: string, r: string) => void;
  clearTokens: () => void; onAuthFailure: () => void; fetchFn?: typeof fetch; };
export function createApiClient(deps: Deps) {
  const doFetch = deps.fetchFn ?? fetch;
  async function refresh(): Promise<boolean> {
    const { refresh } = deps.getTokens(); if (!refresh) return false;
    const res = await doFetch(`${deps.baseUrl}/auth/refresh`, { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: refresh }) });
    if (res.status >= 400) return false;
    const b = await res.json(); deps.setTokens(b.accessToken, b.refreshToken); return true;
  }
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const send = () => { const { access } = deps.getTokens();
      return doFetch(`${deps.baseUrl}${path}`, { method,
        headers: { "Content-Type": "application/json", ...(access ? { Authorization: `Bearer ${access}` } : {}) },
        body: body ? JSON.stringify(body) : undefined }); };
    let res = await send();
    if (res.status === 401) {
      if (await refresh()) res = await send();
      else { deps.clearTokens(); deps.onAuthFailure(); throw new Error("UNAUTHENTICATED"); }
    }
    if (res.status >= 400) throw new Error(`HTTP_${res.status}`);
    return res.json() as Promise<T>;
  }
  return { get: <T>(p: string) => request<T>("GET", p), post: <T>(p: string, b?: unknown) => request<T>("POST", p, b),
    put: <T>(p: string, b?: unknown) => request<T>("PUT", p, b) };
}
```
```ts
// src/lib/http/index.ts
import { createApiClient } from "./apiClient"; import { authStorage } from "./authStorage"; import { authEvents } from "./authEvents";
export const api = createApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL,
  getTokens: () => authStorage.get(), setTokens: (a, r) => authStorage.set(a, r),
  clearTokens: () => authStorage.clear(), onAuthFailure: () => authEvents.emitLogout() });
```

- [ ] **Step 5: Rodar e passar** — `npx vitest run apiClient` → PASS.
- [ ] **Step 6: Commit** — `git commit -am "feat(web): JWT api client with refresh (tested)"`

---

## Task 4: Auth — context, login, rotas protegidas, layout por papel

**Files:** `src/features/auth/{authService,useAuth,ProtectedRoute}.tsx`, `src/components/layout/{AppLayout,Sidebar}.tsx`, `src/App.tsx`, páginas `login`/`forgot`.

- [ ] **Step 1: `authService`** (igual mobile, `localStorage`)

```ts
// src/features/auth/authService.ts
import { api } from "../../lib/http"; import { authStorage } from "../../lib/http/authStorage";
export type AuthResponse = { accessToken: string; refreshToken: string; username: string; authorities: string[] };
export const authService = {
  async login(login: string, senha: string) { const r = await api.post<AuthResponse>("/auth/login", { login, senha }); authStorage.set(r.accessToken, r.refreshToken); return r; },
  me: () => api.get<{ username: string; authorities: string[]; displayName: string }>("/auth/me"),
  forgot: (email: string) => api.post("/auth/forgot-password", { email }),
};
export const has = (u: AuthResponse | null, role: string) => !!u?.authorities.includes(role);
```

- [ ] **Step 2: `useAuth` + `ProtectedRoute`** (contexto; redireciona; restringe por authority)

```tsx
// src/features/auth/useAuth.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { authService, AuthResponse } from "./authService";
import { authEvents } from "../../lib/http/authEvents";
import { authStorage } from "../../lib/http/authStorage";
const Ctx = createContext<{ user: AuthResponse | null; login: (l: string, s: string) => Promise<void>; logout: () => void } | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null);
  useEffect(() => authEvents.onLogout(() => setUser(null)), []);
  const login = async (l: string, s: string) => setUser(await authService.login(l, s));
  const logout = () => { authStorage.clear(); setUser(null); };
  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx)!;
```
```tsx
// src/features/auth/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";
export function ProtectedRoute({ children, anyOf }: { children: React.ReactNode; anyOf?: string[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (anyOf && !anyOf.some(a => user.authorities.includes(a))) return <Navigate to="/" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 3: Rotas** — `src/App.tsx` (React Router 6; home redireciona por papel)

```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./features/auth/useAuth";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
// importar páginas (Task 5/6/7) e Login/Forgot
function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.authorities.includes("ROLE_ADMIN")) return <Navigate to="/admin/usuarios" replace />;
  if (user.authorities.includes("ROLE_PROFESSOR")) return <Navigate to="/professor/dashboard" replace />;
  return <Navigate to="/aluno/dashboard" replace />;
}
export default function App() {
  return (
    <AuthProvider><BrowserRouter><Routes>
      {/* <Route path="/login" .../> <Route path="/forgot" .../> */}
      <Route path="/" element={<Home />} />
      {/* /aluno/* , /professor/* , /admin/* dentro de <ProtectedRoute anyOf={[...]}> */}
    </Routes></BrowserRouter></AuthProvider>
  );
}
```

- [ ] **Step 4: Login + Forgot pages** (shadcn `Input`/`Button`/`Card`; chamam `useAuth().login` / `authService.forgot`). Erro → toast Sonner.
- [ ] **Step 5: Layout** — `AppLayout` com `Sidebar` cujos itens variam por authority (Aluno/Professor/Admin) + botão logout.
- [ ] **Step 6: Verificar** — login admin → vai p/ admin; professor → professor; aluno → aluno. Expected: OK.
- [ ] **Step 7: Commit** — `git commit -am "feat(web): auth context, login, protected routes, role layout"`

---

## Task 5: Páginas do Aluno (paridade com mobile)

**Files:** `src/features/aluno/alunoService.ts` + páginas `src/features/aluno/pages/*`.

> Mesmos endpoints `/me/*` do Plano 3. Layout web (tabelas/cards) inspirado no Figma mobile, adaptado p/ tela larga.

- [ ] **Step 1: `alunoService`** (idêntico ao mobile — `api.get`/`post` em `/me/*`)

```ts
// src/features/aluno/alunoService.ts
import { api } from "../../lib/http";
export const alunoService = {
  dashboard: () => api.get<any>("/me/dashboard"),
  aulas: (status: "proximas" | "passadas") => api.get<any[]>(`/me/aulas?status=${status}`),
  aula: (id: string) => api.get<any>(`/me/aulas/${id}`),
  materiais: (busca?: string) => api.get<any[]>(`/me/materiais${busca ? `?busca=${encodeURIComponent(busca)}` : ""}`),
  progresso: () => api.get<any>("/me/progresso"),
  metas: (status?: "ATIVA" | "CONCLUIDA") => api.get<any[]>(`/me/metas${status ? `?status=${status}` : ""}`),
  registrarPratica: (duracaoMin: number, observacao?: string) => api.post<any>("/me/praticas", { duracaoMin, observacao }),
  criarMeta: (titulo: string, tipo: string, alvo: number, descricao?: string) => api.post<any>("/me/metas", { titulo, tipo, alvo, descricao }),
};
```

- [ ] **Step 2: Página Dashboard** (RF03) — exemplo de padrão

```tsx
// src/features/aluno/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { alunoService } from "../alunoService";
export default function AlunoDashboard() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { alunoService.dashboard().then(setD); }, []);
  if (!d) return <p className="p-6">Carregando...</p>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
      <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Nível</p><p className="text-2xl font-bold">{d.nivel} · {d.xp} XP</p></div>
      <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Sequência</p><p className="text-2xl font-bold">🔥 {d.sequenciaDias} dias</p></div>
      <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Prática semanal</p><p className="text-2xl font-bold">{d.praticaSemanalMin} min</p></div>
    </div>
  );
}
```

- [ ] **Step 3: Demais páginas do aluno** (mesmo padrão `useEffect`→service→render)

Implementar consumindo `alunoService`:
- `Aulas` (RF04) — tabela Próximas/Passadas; linha → detalhe.
- `AulaDetalhe` (RF05) — dados + lista de anexos (link download).
- `Materiais` (RF06) — busca + tabela + botão baixar.
- `Pratica` (RF07) — form → `registrarPratica` → toast XP.
- `Progresso` (RF08) — cards XP/nível/sequência/tempo.
- `Metas` (RF09) — abas Ativas/Concluídas + criar meta.

- [ ] **Step 4: Verificar com backend** (aluno de teste) e **commit** — `git commit -am "feat(web): aluno pages (parity with mobile)"`

---

## Task 6: Páginas do Professor (paridade com mobile)

**Files:** `src/features/professor/professorService.ts` + páginas.

- [ ] **Step 1: `professorService`** (endpoints `/professor/*`, igual mobile)

```ts
// src/features/professor/professorService.ts
import { api } from "../../lib/http";
export const professorService = {
  dashboard: () => api.get<any>("/professor/dashboard"),
  alunos: () => api.get<any[]>("/professor/alunos"),
  aluno: (id: string) => api.get<any>(`/professor/alunos/${id}`),
  novaAula: (b: any) => api.post<any>("/professor/aulas", b),
  historico: (inicio: string, fim: string) => api.get<any[]>(`/professor/aulas?inicio=${inicio}&fim=${fim}`),
  frequencia: (aulaId: string, status: string, justificativa?: string) => api.post<any>(`/professor/aulas/${aulaId}/frequencia`, { status, justificativa }),
  agenda: (data: string) => api.get<any[]>(`/professor/agenda?data=${data}`),
  relatorios: (alunoId: string) => api.get<any>(`/professor/relatorios?alunoId=${alunoId}`),
};
```

- [ ] **Step 2: Páginas** (padrão `useEffect`→service→render)

Implementar consumindo `professorService`:
- `Dashboard` (RF10), `Alunos` (RF11, tabela), `AlunoDetalhe` (RF12).
- `NovaAula` (RF13) — form + upload de anexo (FormData → endpoint multipart).
- `Frequencia` (RF14) — por aula, seletor Presente/Falta/Justificada.
- `Historico` (RF15), `Agenda` (RF17, calendário/lista por data), `Relatorios` (RF18).
- Material ao aluno (RF16) — upload via `FormData` p/ `/professor/alunos/{id}/materiais` (adicionar `postForm` no `apiClient`).

- [ ] **Step 3: Verificar e commit** — `git commit -am "feat(web): professor pages (parity with mobile)"`

---

## Task 7: Configurador Admin (exclusivo web)

**Files:** `src/features/admin/adminService.ts` + páginas `Usuarios`, `Roles`, `Permissoes`, `Configuracoes`.

> Consome `/admin/security/*` (Task 1) e `/admin/*` (Plano 2 Task 3).

- [ ] **Step 1: `adminService`**

```ts
// src/features/admin/adminService.ts
import { api } from "../../lib/http";
export const adminService = {
  usuarios: () => api.get<any[]>("/admin/security/usuarios"),
  roles: () => api.get<any[]>("/admin/security/roles"),
  permissoes: () => api.get<any[]>("/admin/security/permissoes"),
  setRoles: (userId: string, roleIds: number[]) => api.put(`/admin/security/usuarios/${userId}/roles`, { roleIds }),
  setStatus: (userId: string, ativo: boolean) => api.put(`/admin/security/usuarios/${userId}/status`, { ativo }),
  resetSenha: (userId: string, novaSenha: string) => api.put(`/admin/security/usuarios/${userId}/senha`, { novaSenha }),
  criarRole: (name: string, description: string) => api.post("/admin/security/roles", { name, description }),
  setPerms: (roleId: number, permissionIds: number[]) => api.put(`/admin/security/roles/${roleId}/permissoes`, { permissionIds }),
  // cadastros (Plano 2): criar instrumento/aluno/professor/matricula
  criarInstrumento: (nome: string) => api.post("/admin/instrumentos", { nome }),
  criarAluno: (b: any) => api.post("/admin/alunos", b),
  criarProfessor: (b: any) => api.post("/admin/professores", b),
  criarMatricula: (b: any) => api.post("/admin/matriculas", b),
};
```

- [ ] **Step 2: Página `Usuarios`** — tabela (username, email, status, roles); ações: ativar/desativar, reset senha (dialog), editar roles (multi-select de roles), criar aluno/professor (dialog).

- [ ] **Step 3: Página `Roles`** — lista roles; ao abrir, multi-select de permissões (checkbox por `dominio.acao`) → `setPerms`; criar role.

- [ ] **Step 4: Página `Permissoes`** — somente leitura do catálogo (`permissoes()`), agrupado por domínio.

- [ ] **Step 5: Página `Configuracoes`** — placeholder p/ `Configuracao` chave-valor (quando o endpoint existir; deixar lista vazia + aviso "em breve").

- [ ] **Step 6: Verificar** (login admin) — listar usuários, criar role "MONITOR", dar permissões, atribuir a um usuário, ativar/desativar. Expected: persiste no backend.
- [ ] **Step 7: Commit** — `git commit -am "feat(web): admin configurador (usuarios, roles, permissoes)"`

---

## Task 8: Polimento + verificação final

- [ ] **Step 1: Estados loading/erro/empty** padronizados + toasts Sonner em mutações.
- [ ] **Step 2: Tokens visuais** — alinhar cores/tipografia ao Figma (telas Aluno/Professor) e a um tema sóbrio p/ Admin.
- [ ] **Step 3: Refresh de sessão** — ao montar o app, se houver token, chamar `/auth/me` p/ reidratar `user` (evita logout no F5).
- [ ] **Step 4: Testes + typecheck** — `cd web && npx vitest run && npx tsc --noEmit`. Expected: PASS / sem erro.
- [ ] **Step 5: Smoke E2E** — Aluno, Professor e Admin ponta-a-ponta contra backend local.
- [ ] **Step 6: Commit** — `git commit -am "feat(web): polish, session rehydrate, error states"`

---

## Self-Review (cobertura vs spec)

- Backend admin de segurança (users/roles/permissions) → Task 1 (com IT). ✅
- Paridade Aluno RF03-09 na web → Task 5 (mesmos endpoints `/me/*`). ✅
- Paridade Professor RF10-18 na web → Task 6 (`/professor/*`). ✅
- Configurador Admin (RF28 + cadastros) → Task 7. ✅
- Auth/refresh/rotas por papel → Tasks 3-4 (client testado). ✅
- Placeholders: lógica de rede testada; 1 página-modelo completa por área + wiring explícito por página. Visual detalhado vem do Figma/decisão de design na implementação.
- Consistência: `api`, `authService`, `alunoService`, `professorService`, `adminService`, `useAuth` idênticos entre tasks; endpoints batem com Planos 1, 2 e Task 1 deste plano.

## Observações de escopo
- **Paridade web ≈ duplica o front.** Para TCC, considerar entregar mobile (Aluno/Professor) + web (só Admin) no MVP, e a paridade web como incremento. Decisão do autor — este plano cobre a paridade completa quando desejado.
- Reuso: `alunoService`/`professorService` da web são quase idênticos aos do mobile; se virar monorepo com workspaces, dá p/ extrair um pacote `@harmonia/api-client` compartilhado (melhoria futura, fora do escopo).
