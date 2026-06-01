import React, { createContext, useContext, useEffect, useState } from "react";
import { authService, AuthResponse } from "./authService";
import { authEvents } from "../../lib/http/authEvents";

type AuthState = {
  user: AuthResponse | null;
  loading: boolean;
  login: (l: string, s: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthState>(null as unknown as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = authEvents.onLogout(() => setUser(null));
    return () => {
      unsubscribe();
    };
  }, []);

  const login = async (l: string, s: string) => {
    setLoading(true);
    try {
      setUser(await authService.login(l, s));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => setUser(null);

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
