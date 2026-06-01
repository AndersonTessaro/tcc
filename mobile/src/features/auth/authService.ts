import { api } from "../../lib/http";
import { tokenStorage } from "../../lib/http/tokenStorage";

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  username: string;
  authorities: string[];
};

export const authService = {
  async login(login: string, senha: string) {
    const res = await api.post<AuthResponse>("/auth/login", { login, senha });
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

export const isProfessor = (u: AuthResponse | null) =>
  !!u?.authorities.includes("ROLE_PROFESSOR");
export const isAluno = (u: AuthResponse | null) => !!u?.authorities.includes("ROLE_ALUNO");
