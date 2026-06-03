import { api } from "../../lib/http";
import { tokenStorage } from "../../lib/http/tokenStorage";

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  username: string;
  authorities: string[];
};

export const authService = {
  async login(login: string, password: string) {
    const res = await api.post<AuthResponse>("/auth/login", { login, password });
    await tokenStorage.set(res.accessToken, res.refreshToken);
    return res;
  },
  me: () =>
    api.get<{ username: string; authorities: string[]; displayName: string }>("/auth/me"),
  forgot: (email: string) => api.post("/auth/forgot-password", { email }),
  async logout(refreshToken: string) {
    try {
      await api.post("/auth/logout", { refreshToken });
    } finally {
      await tokenStorage.clear();
    }
  },
};

export const isTeacher = (u: AuthResponse | null) =>
  !!u?.authorities.includes("ROLE_TEACHER");
export const isStudent = (u: AuthResponse | null) => !!u?.authorities.includes("ROLE_STUDENT");
