import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { authService, AuthResponse, isStudent, isTeacher } from "./authService";
import { authEvents } from "../../lib/http/authEvents";
import { tokenStorage } from "../../lib/http/tokenStorage";

type AuthState = {
  user: AuthResponse | null;
  loading: boolean;
  restoring: boolean;
  login: (l: string, s: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreError: unknown;
  retryRestore: () => Promise<void>;
  updateProfile: (profile: Partial<Pick<AuthResponse, "displayName" | "hasAvatar" | "termsAccepted">>) => void;
};

const Ctx = createContext<AuthState>(null as unknown as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);

  const [restoreError, setRestoreError] = useState<unknown>(null);
  const restoreRequest = useRef(0);

  const retryRestore = useCallback(async () => {
    const request = ++restoreRequest.current;
    setRestoring(true);
    setRestoreError(null);
    try {
      const accessToken = await tokenStorage.get();
      if (accessToken) {
        const profile = await authService.me();
        const restored = { ...profile, accessToken };
        if (request === restoreRequest.current && (isStudent(restored) || isTeacher(restored))) setUser(restored);
      }
    } catch (error) {
      if (request === restoreRequest.current) {
        if (error instanceof Error && error.message === "UNAUTHENTICATED") setUser(null);
        else setRestoreError(error);
      }
    } finally {
      if (request === restoreRequest.current) setRestoring(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = authEvents.onLogout(() => setUser(null));
    void retryRestore();
    return () => {
      restoreRequest.current++;
      unsubscribe();
    };
  }, [retryRestore]);

  const login = async (l: string, s: string) => {
    setLoading(true);
    try {
      const authenticated = await authService.login(l, s);
      if (!isStudent(authenticated) && !isTeacher(authenticated)) {
        await authService.logout().catch(() => {});
        throw new Error("MOBILE_PROFILE_REQUIRED");
      }
      const profile = await authService.me().catch((error: unknown) => {
        if (error instanceof Error && error.message === "UNAUTHENTICATED") throw error;
        return null;
      });
      setUser({ ...authenticated, ...profile });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    restoreRequest.current++;
    await authService.logout().catch(() => undefined);
    setUser(null);
    setRestoreError(null);
    setRestoring(false);
  };
  const updateProfile = (profile: Partial<Pick<AuthResponse, "displayName" | "hasAvatar" | "termsAccepted">>) =>
    setUser((current) => current && { ...current, ...profile });

  return <Ctx.Provider value={{ user, loading, restoring, restoreError, retryRestore, login, logout, updateProfile }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
