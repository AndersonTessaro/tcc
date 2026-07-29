import { api } from "@/lib/http";
import { authStorage } from "@/lib/http/authStorage";

export type AuthResponse = {
  accessToken: string;
  username: string;
  authorities: string[];
};

export type Me = { username: string; authorities: string[]; displayName: string };

export const authService = {
  async login(login: string, password: string) {
    const r = await api.post<AuthResponse>("/auth/login", { login, password });
    authStorage.set(r.accessToken);
    return r;
  },
  me: () => api.get<Me>("/auth/me"),
  forgot: (email: string) => api.post("/auth/forgot-password", { email }),
};

export const has = (authorities: string[] | undefined, role: string) =>
  !!authorities?.includes(role);
