import React, { createContext, useContext, useEffect, useState } from "react";
import { authService, AuthResponse, isStudent, isTeacher } from "./authService";
import { authEvents } from "../../lib/http/authEvents";
import { tokenStorage } from "../../lib/http/tokenStorage";

type AuthState = {
  user: AuthResponse | null;
  loading: boolean;
  restoring: boolean;
  login: (l: string, s: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthState>(null as unknown as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let active = true;
    const unsubscribe = authEvents.onLogout(() => setUser(null));
    const restore = async () => {
      try {
        const accessToken = await tokenStorage.get();
        if (accessToken) {
          const profile = await authService.me();
          const restored = { ...profile, accessToken };
          if (active && (isStudent(restored) || isTeacher(restored))) setUser(restored);
        }
      } catch {
        // Keep the saved session on network failure so a later login can retry.
      } finally {
        if (active) setRestoring(false);
      }
    };
    void restore();
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = async (l: string, s: string) => {
    setLoading(true);
    try {
      const authenticated = await authService.login(l, s);
      if (!isStudent(authenticated) && !isTeacher(authenticated)) {
        await authService.logout().catch(() => {});
        throw new Error("MOBILE_PROFILE_REQUIRED");
      }
      const profile = await authService.me().catch(() => null);
      setUser({ ...authenticated, ...profile });
    } finally {
      setLoading(false);
    }
  };

  const logout = () => setUser(null);

  return <Ctx.Provider value={{ user, loading, restoring, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
