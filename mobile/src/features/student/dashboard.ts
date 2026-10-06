import { studentService, type StudentDashboard } from "./studentService";

export type { StudentDashboard };

export const fetchDashboard = (): Promise<StudentDashboard> => studentService.dashboard();

export function firstName(name?: string | null): string {
  const first = name?.split(/[.@ _-]/)[0];
  return first ? `${first.charAt(0).toUpperCase()}${first.slice(1)}` : "Aluno";
}

export function fullName(name?: string | null): string {
  const cleaned = name?.split("@")[0].replace(/[._-]+/g, " ").trim();
  return cleaned ? cleaned.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase()) : "Aluno";
}
