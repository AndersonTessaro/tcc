import { api } from "../../lib/http";

export const professorService = {
  dashboard: () => api.get<any>("/professor/dashboard"),
  alunos: () => api.get<any[]>("/professor/alunos"),
  aluno: (id: string) => api.get<any>(`/professor/alunos/${id}`),
  novaAula: (b: {
    matriculaId: string;
    data: string;
    horaInicio: string;
    horaFim?: string;
    conteudo?: string;
    tarefaCasa?: string;
  }) => api.post<any>("/professor/aulas", b),
  historico: (inicio: string, fim: string) =>
    api.get<any[]>(`/professor/aulas?inicio=${inicio}&fim=${fim}`),
  frequencia: (aulaId: string, status: string, justificativa?: string) =>
    api.post<any>(`/professor/aulas/${aulaId}/frequencia`, { status, justificativa }),
  agenda: (data: string) => api.get<any[]>(`/professor/agenda?data=${data}`),
  relatorios: (alunoId: string) => api.get<any>(`/professor/relatorios?alunoId=${alunoId}`),
};
