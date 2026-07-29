import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { authService } from "./authService";
import { authEvents } from "@/lib/http/authEvents";
import { authStorage } from "@/lib/http/authStorage";

export type SessionUser = { username: string; authorities: string[]; displayName?: string };

type AuthState = {
  user: SessionUser | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Reidrata a sessão no F5: se há token, busca /auth/me.
  useEffect(() => {
    const access = authStorage.get();
    if (!access) {
      setLoading(false);
      return;
    }
    authService
      .me()
      .then((m) => setUser({ username: m.username, authorities: m.authorities, displayName: m.displayName }))
      .catch(() => authStorage.clear())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => authEvents.onLogout(() => setUser(null)), []);

  const login = async (login: string, password: string) => {
    const r = await authService.login(login, password);
    setUser({ username: r.username, authorities: r.authorities });
  };

  const logout = () => {
    authStorage.clear();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
