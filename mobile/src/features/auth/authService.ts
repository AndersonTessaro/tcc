import { api } from "../../lib/http";
import { tokenStorage } from "../../lib/http/tokenStorage";

export type AuthResponse = {
  accessToken: string;
  username: string;
  authorities: string[];
  displayName?: string;
  hasAvatar?: boolean;
};

// Signing out offline must not hold the user behind the default 20 s request timeout.
const LOGOUT_TIMEOUT_MS = 5_000;

export const authService = {
  async login(login: string, password: string) {
    const res = await api.post<AuthResponse>(
      "/auth/login",
      { login, password },
      { auth: false },
    );
    await tokenStorage.set(res.accessToken);
    return res;
  },
  me: () =>
    api.get<{ username: string; authorities: string[]; displayName: string; hasAvatar: boolean }>("/auth/me"),
  reset: (token: string, newPassword: string) => api.post("/auth/reset-password", { token, newPassword }, { auth: false }),
  async logout() {
    try {
      await api.post("/auth/logout", undefined, { timeoutMs: LOGOUT_TIMEOUT_MS });
    } finally {
      await tokenStorage.clear();
    }
  },
};

export const isTeacher = (u: AuthResponse | null) =>
  !!u?.authorities.includes("ROLE_TEACHER");
export const isStudent = (u: AuthResponse | null) => !!u?.authorities.includes("ROLE_STUDENT");
