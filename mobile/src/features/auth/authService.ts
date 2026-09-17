import { api } from "../../lib/http";
import { tokenStorage } from "../../lib/http/tokenStorage";

export type AuthResponse = {
  accessToken: string;
  username: string;
  authorities: string[];
};

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
    api.get<{ username: string; authorities: string[]; displayName: string }>("/auth/me"),
  forgot: (email: string) => api.post("/auth/forgot-password", { email }, { auth: false }),
  async logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      await tokenStorage.clear();
    }
  },
};

export const isTeacher = (u: AuthResponse | null) =>
  !!u?.authorities.includes("ROLE_TEACHER");
export const isStudent = (u: AuthResponse | null) => !!u?.authorities.includes("ROLE_STUDENT");
