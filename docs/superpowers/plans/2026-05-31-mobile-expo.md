# Mobile (Expo) — Aluno + Professor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App React Native (Expo) que autentica no backend Harmonia, roteia por papel (Aluno/Professor) e implementa as telas do Figma consumindo a API REST.

**Architecture:** Expo Router (file-based). Camadas por feature: `components` (apresentação), `hooks` (estado), `services` (chamadas à API — única porta de rede). Cliente HTTP central com JWT access+refresh. Estilo via NativeWind (Tailwind).

**Tech Stack:** Expo SDK (RN + TS), Expo Router, NativeWind, expo-secure-store, Jest (jest-expo) + @testing-library/react-native.

**Pré-requisito:** Backend dos Planos 1 e 2 rodando (auth + `/me/*` + `/professor/*`).

**Design source:** Figma `Knfsw9IIzliM6o9KgLbRhG` (node-ids no `CLAUDE.md`). Em cada tela, puxar layout/cores via MCP Figma (`get_design_context`, `get_screenshot`) no momento da implementação.

---

## File Structure

```
mobile/
├── app/                          # Expo Router
│   ├── _layout.tsx               # root: AuthProvider + roteamento por papel
│   ├── (auth)/login.tsx  (auth)/forgot-password.tsx
│   ├── (aluno)/_layout.tsx  (aluno)/dashboard.tsx  aulas.tsx  aula/[id].tsx
│   │            materiais.tsx  pratica.tsx  progresso.tsx  metas.tsx
│   └── (professor)/_layout.tsx  dashboard.tsx  alunos.tsx  aluno/[id].tsx
│                    nova-aula.tsx  frequencia/[aulaId].tsx  agenda.tsx  relatorios.tsx
├── src/
│   ├── lib/http/                 # apiClient, tokenStorage, authEvents
│   ├── features/
│   │   ├── auth/                 # useAuth, authService, types
│   │   ├── aluno/                # services + hooks + components
│   │   └── professor/
│   └── ui/                       # componentes base (Card, Button, XpBar...)
├── tailwind.config.js  global.css  babel.config.js  metro.config.js
├── app.json  tsconfig.json  package.json
└── .env  (EXPO_PUBLIC_API_URL)
```

---

## Task 1: Scaffold Expo + Router + NativeWind

**Files:** projeto `mobile/` (gerado), `tailwind.config.js`, `global.css`, `babel.config.js`, `metro.config.js`, `app/_layout.tsx`, `app/index.tsx`, `.env`.

- [ ] **Step 1: Criar projeto Expo (TypeScript, Router)**

Run:
```bash
cd C:/Codding/Fag/tcc_anderson
npx create-expo-app@latest mobile --template default
cd mobile
npx expo install nativewind tailwindcss react-native-reanimated react-native-safe-area-context
npx expo install expo-secure-store expo-router
npm i -D jest-expo jest @testing-library/react-native @types/jest
```
Expected: projeto criado; deps instaladas.

- [ ] **Step 2: Configurar NativeWind** — `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: { primary: "#6C5CE7", accent: "#00B894", bg: "#0E0E1A" }, // ajustar c/ tokens do Figma
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: `global.css`, `babel.config.js`, `metro.config.js`**

```css
/* global.css */
@tailwind base; @tailwind components; @tailwind utilities;
```
```js
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return { presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"] };
};
```
```js
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
module.exports = withNativeWind(getDefaultConfig(__dirname), { input: "./global.css" });
```

- [ ] **Step 4: `.env` + tipos**

```
EXPO_PUBLIC_API_URL=http://localhost:8080
```

- [ ] **Step 5: Root layout placeholder** — `app/_layout.tsx`

```tsx
import "../global.css";
import { Stack } from "expo-router";
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 6: Subir o app** — Run: `npx expo start` → abrir no Expo Go/emulador. Expected: app sobe sem erro, tela default renderiza com classe Tailwind aplicada.
- [ ] **Step 7: Commit** — `git add mobile && git commit -m "chore(mobile): scaffold Expo + Router + NativeWind"`

---

## Task 2: Cliente HTTP com JWT (access + refresh) — TDD na lógica de refresh

**Files:** `src/lib/http/tokenStorage.ts`, `authEvents.ts`, `apiClient.ts`, `src/features/auth/authService.ts`. Test: `src/lib/http/__tests__/apiClient.test.ts`.

- [ ] **Step 1: `tokenStorage` (expo-secure-store)**

```ts
// src/lib/http/tokenStorage.ts
import * as SecureStore from "expo-secure-store";
const ACCESS = "harmonia_access", REFRESH = "harmonia_refresh";
export const tokenStorage = {
  async get() {
    return {
      access: await SecureStore.getItemAsync(ACCESS),
      refresh: await SecureStore.getItemAsync(REFRESH),
    };
  },
  async set(access: string, refresh: string) {
    await SecureStore.setItemAsync(ACCESS, access);
    await SecureStore.setItemAsync(REFRESH, refresh);
  },
  async clear() {
    await SecureStore.deleteItemAsync(ACCESS);
    await SecureStore.deleteItemAsync(REFRESH);
  },
};
```

- [ ] **Step 2: `authEvents` (dispara logout em 401 irreversível)**

```ts
// src/lib/http/authEvents.ts
type Listener = () => void;
const listeners = new Set<Listener>();
export const authEvents = {
  onLogout(l: Listener) { listeners.add(l); return () => listeners.delete(l); },
  emitLogout() { listeners.forEach((l) => l()); },
};
```

- [ ] **Step 3: Teste que falha — refresh no 401 e logout quando refresh falha**

```ts
// src/lib/http/__tests__/apiClient.test.ts
import { createApiClient } from "../apiClient";

function jsonResponse(status: number, body: any) {
  return Promise.resolve({ status, ok: status < 400, json: () => Promise.resolve(body) } as Response);
}

describe("apiClient", () => {
  const store = { access: "a1", refresh: "r1" };
  const deps = {
    baseUrl: "http://x",
    getTokens: async () => store,
    setTokens: async (a: string, r: string) => { store.access = a; store.refresh = r; },
    clearTokens: async () => { store.access = ""; store.refresh = ""; },
    onAuthFailure: jest.fn(),
  };

  it("retries with refreshed token after 401", async () => {
    const fetchMock = jest.fn()
      .mockReturnValueOnce(jsonResponse(401, {}))                              // 1ª chamada protegida
      .mockReturnValueOnce(jsonResponse(200, { accessToken: "a2", refreshToken: "r2" })) // refresh
      .mockReturnValueOnce(jsonResponse(200, { ok: true }));                   // retry
    const api = createApiClient({ ...deps, fetchFn: fetchMock as any });
    const res = await api.get("/me/dashboard");
    expect(res).toEqual({ ok: true });
    expect(store.access).toBe("a2");
  });

  it("emits auth failure when refresh fails", async () => {
    store.access = "a1"; store.refresh = "r1";
    const fetchMock = jest.fn()
      .mockReturnValueOnce(jsonResponse(401, {}))
      .mockReturnValueOnce(jsonResponse(401, {})); // refresh falha
    const api = createApiClient({ ...deps, fetchFn: fetchMock as any });
    await expect(api.get("/me/dashboard")).rejects.toBeTruthy();
    expect(deps.onAuthFailure).toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Rodar e ver falhar** — Run: `cd mobile && npx jest apiClient` → FAIL (`createApiClient` não existe).

- [ ] **Step 5: Implementar `apiClient`**

```ts
// src/lib/http/apiClient.ts
type Tokens = { access: string | null; refresh: string | null };
type Deps = {
  baseUrl: string;
  getTokens: () => Promise<Tokens>;
  setTokens: (a: string, r: string) => Promise<void>;
  clearTokens: () => Promise<void>;
  onAuthFailure: () => void;
  fetchFn?: typeof fetch;
};

export function createApiClient(deps: Deps) {
  const doFetch = deps.fetchFn ?? fetch;

  async function refresh(): Promise<boolean> {
    const { refresh } = await deps.getTokens();
    if (!refresh) return false;
    const res = await doFetch(`${deps.baseUrl}/auth/refresh`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (res.status >= 400) return false;
    const body = await res.json();
    await deps.setTokens(body.accessToken, body.refreshToken);
    return true;
  }

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const send = async () => {
      const { access } = await deps.getTokens();
      return doFetch(`${deps.baseUrl}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(access ? { Authorization: `Bearer ${access}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    };
    let res = await send();
    if (res.status === 401) {
      if (await refresh()) {
        res = await send();
      } else {
        await deps.clearTokens();
        deps.onAuthFailure();
        throw new Error("UNAUTHENTICATED");
      }
    }
    if (res.status >= 400) throw new Error(`HTTP_${res.status}`);
    return res.json() as Promise<T>;
  }

  return {
    get: <T>(p: string) => request<T>("GET", p),
    post: <T>(p: string, b?: unknown) => request<T>("POST", p, b),
    put: <T>(p: string, b?: unknown) => request<T>("PUT", p, b),
  };
}
```

- [ ] **Step 6: Rodar e ver passar** — `npx jest apiClient` → PASS (2 testes).

- [ ] **Step 7: Instância app-wide + `authService`**

```ts
// src/lib/http/index.ts
import { createApiClient } from "./apiClient";
import { tokenStorage } from "./tokenStorage";
import { authEvents } from "./authEvents";
export const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL!,
  getTokens: () => tokenStorage.get(),
  setTokens: (a, r) => tokenStorage.set(a, r),
  clearTokens: () => tokenStorage.clear(),
  onAuthFailure: () => authEvents.emitLogout(),
});
```
```ts
// src/features/auth/authService.ts
import { api } from "../../lib/http";
import { tokenStorage } from "../../lib/http/tokenStorage";
export type AuthResponse = { accessToken: string; refreshToken: string; username: string; authorities: string[] };
export const authService = {
  async login(login: string, senha: string) {
    const res = await api.post<AuthResponse>("/auth/login", { login, senha });
    await tokenStorage.set(res.accessToken, res.refreshToken);
    return res;
  },
  me: () => api.get<{ username: string; authorities: string[]; displayName: string }>("/auth/me"),
  forgot: (email: string) => api.post("/auth/forgot-password", { email }),
  async logout(refreshToken: string) { try { await api.post("/auth/logout", { refreshToken }); } finally { await tokenStorage.clear(); } },
};
```

- [ ] **Step 8: Commit** — `git commit -am "feat(mobile): JWT api client with refresh + auth service (tested)"`

---

## Task 3: Contexto de auth + tela de login + esqueci a senha

**Files:** `src/features/auth/useAuth.tsx`, `app/(auth)/login.tsx`, `app/(auth)/forgot-password.tsx`.

- [ ] **Step 1: `useAuth` (contexto global)**

```tsx
// src/features/auth/useAuth.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { authService, AuthResponse } from "./authService";
import { authEvents } from "../../lib/http/authEvents";

type AuthState = { user: AuthResponse | null; loading: boolean;
  login: (l: string, s: string) => Promise<void>; logout: () => void; };
const Ctx = createContext<AuthState>(null as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => authEvents.onLogout(() => setUser(null)), []);
  const login = async (l: string, s: string) => {
    setLoading(true);
    try { setUser(await authService.login(l, s)); } finally { setLoading(false); }
  };
  const logout = () => setUser(null);
  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
export const isProfessor = (u: AuthResponse | null) => !!u?.authorities.includes("ROLE_PROFESSOR");
export const isAluno = (u: AuthResponse | null) => !!u?.authorities.includes("ROLE_ALUNO");
```

- [ ] **Step 2: Tela de login** — `app/(auth)/login.tsx`

> Puxar layout do Figma node `61:303` (LOGIN) via MCP. Estrutura mínima funcional:

```tsx
import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useAuth } from "../../src/features/auth/useAuth";
import { Link } from "expo-router";

export default function Login() {
  const { login, loading } = useAuth();
  const [l, setL] = useState(""); const [s, setS] = useState(""); const [err, setErr] = useState("");
  const onSubmit = async () => {
    setErr("");
    try { await login(l, s); } catch { setErr("Login ou senha inválidos"); }
  };
  return (
    <View className="flex-1 justify-center px-6 bg-bg">
      <Text className="text-3xl font-bold text-white mb-8">Bem-vindo</Text>
      <TextInput className="bg-white/10 text-white rounded-xl p-4 mb-3" placeholder="E-mail ou usuário"
        autoCapitalize="none" value={l} onChangeText={setL} />
      <TextInput className="bg-white/10 text-white rounded-xl p-4 mb-2" placeholder="Senha"
        secureTextEntry value={s} onChangeText={setS} />
      {err ? <Text className="text-red-400 mb-2">{err}</Text> : null}
      <Pressable className="bg-primary rounded-xl p-4 items-center" onPress={onSubmit} disabled={loading}>
        <Text className="text-white font-semibold">{loading ? "Entrando..." : "Entrar"}</Text>
      </Pressable>
      <Link href="/(auth)/forgot-password" className="text-accent mt-4 text-center">Esqueci a senha</Link>
    </View>
  );
}
```

- [ ] **Step 3: Tela esqueci a senha** — `app/(auth)/forgot-password.tsx`

```tsx
import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { authService } from "../../src/features/auth/authService";

export default function Forgot() {
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false);
  const onSubmit = async () => { await authService.forgot(email); setSent(true); };
  return (
    <View className="flex-1 justify-center px-6 bg-bg">
      <Text className="text-2xl font-bold text-white mb-6">Recuperar senha</Text>
      {sent ? <Text className="text-accent">Se o e-mail existir, enviamos as instruções.</Text> : (
        <>
          <TextInput className="bg-white/10 text-white rounded-xl p-4 mb-3" placeholder="E-mail"
            autoCapitalize="none" value={email} onChangeText={setEmail} />
          <Pressable className="bg-primary rounded-xl p-4 items-center" onPress={onSubmit}>
            <Text className="text-white font-semibold">Enviar</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
```

- [ ] **Step 4: Verificar login real** — backend rodando; logar com `admin/Admin@123` ou aluno de teste. Expected: login OK, token salvo.
- [ ] **Step 5: Commit** — `git commit -am "feat(mobile): auth context + login + forgot-password screens"`

---

## Task 4: Roteamento por papel

**Files:** Modify `app/_layout.tsx`; Create `app/(aluno)/_layout.tsx`, `app/(professor)/_layout.tsx`.

- [ ] **Step 1: Root com AuthProvider + redirecionamento**

```tsx
// app/_layout.tsx
import "../global.css";
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth, isProfessor } from "../src/features/auth/useAuth";

function Guard() {
  const { user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  useEffect(() => {
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) router.replace("/(auth)/login");
    else if (user && inAuth) router.replace(isProfessor(user) ? "/(professor)/dashboard" : "/(aluno)/dashboard");
  }, [user, segments]);
  return <Slot />;
}
export default function RootLayout() {
  return <AuthProvider><Guard /></AuthProvider>;
}
```

- [ ] **Step 2: Tab layouts** — `(aluno)/_layout.tsx` e `(professor)/_layout.tsx`

```tsx
// app/(aluno)/_layout.tsx
import { Tabs } from "expo-router";
export default function AlunoLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" options={{ title: "Início" }} />
      <Tabs.Screen name="aulas" options={{ title: "Aulas" }} />
      <Tabs.Screen name="materiais" options={{ title: "Materiais" }} />
      <Tabs.Screen name="progresso" options={{ title: "Progresso" }} />
      <Tabs.Screen name="metas" options={{ title: "Metas" }} />
    </Tabs>
  );
}
```
```tsx
// app/(professor)/_layout.tsx
import { Tabs } from "expo-router";
export default function ProfessorLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" options={{ title: "Início" }} />
      <Tabs.Screen name="alunos" options={{ title: "Alunos" }} />
      <Tabs.Screen name="agenda" options={{ title: "Agenda" }} />
      <Tabs.Screen name="relatorios" options={{ title: "Relatórios" }} />
    </Tabs>
  );
}
```

- [ ] **Step 3: Verificar roteamento** — logar como aluno → cai no tab aluno; como professor → tab professor. Expected: OK.
- [ ] **Step 4: Commit** — `git commit -am "feat(mobile): role-based routing (aluno/professor stacks)"`

---

## Task 5: Telas do Aluno

**Files:** `src/features/aluno/alunoService.ts`, telas em `app/(aluno)/*`, componentes em `src/ui/`.

> Cada tela: puxar visual do Figma (node-ids no `CLAUDE.md`: Dashboard `15:32`, Minhas Aulas `37:107`, Detalhes da Aula `37:215`, Metas `48:260`) via MCP. Abaixo o **wiring de dados** (o que é fixo); o estilo segue o Figma.

- [ ] **Step 1: `alunoService` (mapeia endpoints `/me/*`)**

```ts
// src/features/aluno/alunoService.ts
import { api } from "../../lib/http";
export const alunoService = {
  dashboard: () => api.get<any>("/me/dashboard"),
  aulas: (status: "proximas" | "passadas") => api.get<any[]>(`/me/aulas?status=${status}`),
  aula: (id: string) => api.get<any>(`/me/aulas/${id}`),
  materiais: (busca?: string) => api.get<any[]>(`/me/materiais${busca ? `?busca=${encodeURIComponent(busca)}` : ""}`),
  progresso: () => api.get<any>("/me/progresso"),
  metas: (status?: "ativa" | "concluida") => api.get<any[]>(`/me/metas${status ? `?status=${status.toUpperCase()}` : ""}`),
  registrarPratica: (duracaoMin: number, observacao?: string) =>
    api.post<any>("/me/praticas", { duracaoMin, observacao }),
  criarMeta: (titulo: string, tipo: string, alvo: number, descricao?: string) =>
    api.post<any>("/me/metas", { titulo, tipo, alvo, descricao }),
};
```

- [ ] **Step 2: Componentes UI reutilizáveis** — `src/ui/{Card,XpBar,StreakBadge}.tsx`

```tsx
// src/ui/Card.tsx
import { View } from "react-native";
export const Card = ({ children }: { children: React.ReactNode }) =>
  <View className="bg-white/5 rounded-2xl p-4 mb-3">{children}</View>;
```
```tsx
// src/ui/XpBar.tsx
import { View, Text } from "react-native";
export function XpBar({ xp, nivel }: { xp: number; nivel: number }) {
  const base = (nivel - 1) ** 2 * 100, next = nivel ** 2 * 100;
  const pct = Math.min(100, Math.round(((xp - base) / (next - base)) * 100));
  return (
    <View>
      <Text className="text-white font-semibold mb-1">Nível {nivel} · {xp} XP</Text>
      <View className="h-3 bg-white/10 rounded-full overflow-hidden">
        <View className="h-3 bg-accent rounded-full" style={{ width: `${pct}%` }} />
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Dashboard do aluno** (RF03) — `app/(aluno)/dashboard.tsx`

```tsx
import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { alunoService } from "../../src/features/aluno/alunoService";
import { Card } from "../../src/ui/Card";
import { XpBar } from "../../src/ui/XpBar";

export default function Dashboard() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { alunoService.dashboard().then(setD); }, []);
  if (!d) return <Text className="text-white p-6">Carregando...</Text>;
  return (
    <ScrollView className="flex-1 bg-bg p-6">
      <Card><XpBar xp={d.xp} nivel={d.nivel} /></Card>
      <Card><Text className="text-white">🔥 Sequência: {d.sequenciaDias} dias</Text></Card>
      <Card><Text className="text-white">Prática na semana: {d.praticaSemanalMin} min</Text></Card>
      <Card><Text className="text-white">Próxima aula: {d.proximaAula ? `${d.proximaAula.data} ${d.proximaAula.horaInicio}` : "—"}</Text></Card>
    </ScrollView>
  );
}
```

- [ ] **Step 4: Demais telas do aluno** (mesmo padrão: `useEffect`→service→render Figma-styled)

Implementar, seguindo o padrão acima e o visual do Figma, consumindo `alunoService`:
- `aulas.tsx` (RF04) — toggle Próximas/Passadas → `aulas(status)`; item navega p/ `aula/[id]`.
- `aula/[id].tsx` (RF05) — `aula(id)` → mostra data/hora/instrumento/professor/conteúdo/tarefa + lista `anexos`.
- `materiais.tsx` (RF06) — campo de busca → `materiais(busca)`; item com botão download (abre `/me/materiais/{id}/download`).
- `pratica.tsx` (RF07) — form duração+observação → `registrarPratica` → mostra XP atualizado.
- `progresso.tsx` (RF08) — `progresso()` → XP, nível, frequência, tempo total, sequência.
- `metas.tsx` (RF09) — tabs Ativas/Concluídas → `metas(status)`; botão nova meta → `criarMeta`.

- [ ] **Step 5: Verificar com backend** — logar como aluno de teste; navegar todas as telas; registrar prática e ver XP subir. Expected: dados reais carregam.
- [ ] **Step 6: Commit** — `git commit -am "feat(mobile): aluno screens (dashboard, aulas, materiais, pratica, progresso, metas)"`

---

## Task 6: Telas do Professor

**Files:** `src/features/professor/professorService.ts`, telas em `app/(professor)/*`.

> Figma: Dashboard `61:346`, Alunos `69:478`, Nova Aula, Frequência, Agenda, Relatórios. Wiring abaixo.

- [ ] **Step 1: `professorService` (`/professor/*`)**

```ts
// src/features/professor/professorService.ts
import { api } from "../../lib/http";
export const professorService = {
  dashboard: () => api.get<any>("/professor/dashboard"),
  alunos: () => api.get<any[]>("/professor/alunos"),
  aluno: (id: string) => api.get<any>(`/professor/alunos/${id}`),
  novaAula: (b: { matriculaId: string; data: string; horaInicio: string; horaFim?: string; conteudo?: string; tarefaCasa?: string }) =>
    api.post<any>("/professor/aulas", b),
  historico: (inicio: string, fim: string) => api.get<any[]>(`/professor/aulas?inicio=${inicio}&fim=${fim}`),
  frequencia: (aulaId: string, status: string, justificativa?: string) =>
    api.post<any>(`/professor/aulas/${aulaId}/frequencia`, { status, justificativa }),
  agenda: (data: string) => api.get<any[]>(`/professor/agenda?data=${data}`),
  relatorios: (alunoId: string) => api.get<any>(`/professor/relatorios?alunoId=${alunoId}`),
};
```

- [ ] **Step 2: Telas do professor** (padrão `useEffect`→service→Figma-styled)

Implementar consumindo `professorService`:
- `dashboard.tsx` (RF10) — `dashboard()` → aulas hoje, total alunos, próximas.
- `alunos.tsx` (RF11) — `alunos()` → lista; item navega p/ `aluno/[id]`.
- `aluno/[id].tsx` (RF12) — `aluno(id)` → frequência, XP, metas, prática, observações.
- `nova-aula.tsx` (RF13) — form (matrícula, data, hora, conteúdo, tarefa) → `novaAula`; upload de anexo opcional.
- `frequencia/[aulaId].tsx` (RF14) — seletor Presente/Falta/Justificada → `frequencia(aulaId, status)`.
- `agenda.tsx` (RF17) — date picker → `agenda(data)` → aulas do dia.
- `relatorios.tsx` (RF18) — escolhe aluno → `relatorios(alunoId)`.

> Upload de material (RF16): usar `expo-image-picker`/`expo-document-picker` + `FormData` para `POST /professor/alunos/{id}/materiais` (multipart). Adicionar `multipart` no `apiClient` se necessário (método `postForm`).

- [ ] **Step 3: Verificar com backend** — logar como professor de teste (vinculado a aluno via `/admin/matriculas`); criar aula, registrar frequência PRESENTE, conferir XP do aluno subir. Expected: fluxo completo.
- [ ] **Step 4: Commit** — `git commit -am "feat(mobile): professor screens (dashboard, alunos, nova-aula, frequencia, agenda, relatorios)"`

---

## Task 7: Polimento + menu/logout + verificação final

**Files:** `src/ui/`, telas "Mais" em cada stack, ajustes finais.

- [ ] **Step 1: Tela "Mais"/Menu com logout** (ambos stacks) — botão chama `authService.logout(refresh)` + `useAuth().logout()`.
- [ ] **Step 2: Estados de loading/erro/empty** padronizados (componente `src/ui/Screen.tsx`).
- [ ] **Step 3: Ajuste de tokens visuais** — extrair cores/tipografia reais do Figma (`get_variable_defs`) p/ `tailwind.config.js`.
- [ ] **Step 4: Rodar testes + lint** — `cd mobile && npx jest && npx tsc --noEmit`. Expected: PASS / sem erros de tipo.
- [ ] **Step 5: Smoke test E2E manual** — fluxo aluno e professor ponta-a-ponta contra backend local.
- [ ] **Step 6: Commit** — `git commit -am "feat(mobile): menu/logout + loading/error states + visual tokens"`

---

## Self-Review (cobertura vs spec)

- Login/forgot → Task 3. Roteamento por papel → Task 4. ✅
- Aluno RF03-09 → Task 5 (cada tela mapeada a um endpoint `/me/*`). ✅
- Professor RF10-18 → Task 6 (cada tela mapeada a `/professor/*`). ✅
- Cliente HTTP com refresh + logout em 401 → Task 2 (com testes). ✅
- RNF01 interface intuitiva / RNF02 mobile → telas Expo seguindo Figma. ✅
- Placeholders: lógica de rede 100% codada e testada; telas-modelo com código completo + padrão replicável e wiring de dados explícito por tela. Pixel/visual vem do Figma MCP na implementação (decisão de design, não do plano).
- Consistência: `api`, `authService`, `alunoService`, `professorService`, `useAuth` usados igual entre tasks.

## Dependências
- Backend Planos 1+2 no ar. `EXPO_PUBLIC_API_URL` aponta p/ o backend (emulador Android: `http://10.0.2.2:8080`).
- Dados de teste criados via `/admin/*` (aluno, professor, matrícula) antes de testar as telas.
