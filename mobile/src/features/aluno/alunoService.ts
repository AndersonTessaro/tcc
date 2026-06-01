import { api } from "../../lib/http";

export const alunoService = {
  dashboard: () => api.get<any>("/me/dashboard"),
  aulas: (status: "proximas" | "passadas") => api.get<any[]>(`/me/aulas?status=${status}`),
  aula: (id: string) => api.get<any>(`/me/aulas/${id}`),
  materiais: (busca?: string) =>
    api.get<any[]>(`/me/materiais${busca ? `?busca=${encodeURIComponent(busca)}` : ""}`),
  progresso: () => api.get<any>("/me/progresso"),
  metas: (status?: "ATIVA" | "CONCLUIDA") =>
    api.get<any[]>(`/me/metas${status ? `?status=${status}` : ""}`),
  registrarPratica: (duracaoMin: number, observacao?: string) =>
    api.post<any>("/me/praticas", { duracaoMin, observacao }),
  criarMeta: (titulo: string, tipo: string, alvo: number, descricao?: string) =>
    api.post<any>("/me/metas", { titulo, tipo, alvo, descricao }),
};
