import { ApiError } from "./apiError";

const BY_CODE: Record<string, string> = {
  SCHEDULE_CONFLICT: "Conflito de horário com outra aula ou horário fixo",
  DUPLICATE_RESOURCE: "Já existe um cadastro com esses dados",
  VALIDATION: "Dados inválidos. Revise os campos.",
  INVALID_RESET_TOKEN: "Link de recuperação inválido ou expirado. Solicite outro link.",
  NOT_FOUND: "Registro não encontrado",
  OWNERSHIP_DENIED: "Sem permissão para acessar este registro",
  ACCESS_DENIED: "Sem permissão para esta ação",
  INVALID_MAKEUP_LINK: "Esta aula não pode receber reposição",
  PROFILE_REQUIRED: "Esta ação exige um perfil de professor ou aluno",
};

// Backend domain messages are in English; only the ones a user can trigger are translated.
const BY_DETAIL: [RegExp, string][] = [
  [/Lesson already has a makeup linked/i, "Esta aula já tem uma reposição"],
  [/Only a completed or canceled lesson can receive a makeup/i, "Conclua ou cancele a aula antes de agendar reposição"],
  [/canceled lesson/i, "Aula cancelada não recebe frequência"],
  [/before the lesson date/i, "A frequência só pode ser marcada a partir do dia da aula"],
  [/Enrollment is not active/i, "Matrícula inativa"],
  [/does not teach this instrument/i, "O professor não ensina este instrumento"],
  [/(Student|Teacher|Instrument) is not active/i, "Aluno, professor ou instrumento inativo"],
  [/Invalid lesson status transition/i, "Mudança de status não permitida"],
  [/End time must be after start time/i, "O fim deve ser depois do início"],
];

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const translated = BY_DETAIL.find(([pattern]) => pattern.test(error.detail ?? ""));
    if (translated) return translated[1];
    if (error.code && BY_CODE[error.code]) return BY_CODE[error.code];
    if (error.status === 422) return "Operação não permitida";
    return fallback;
  }
  if (error instanceof Error && error.message === "UNAUTHENTICATED") return "Sessão expirada. Entre novamente.";
  if (error instanceof TypeError) return "Sem conexão com o servidor";
  return fallback;
}

export type ApiErrorField = "time" | "date" | "enrollment";

const FIELD_BY_DETAIL: [RegExp, ApiErrorField][] = [
  [/End time must be after start time|time range|start time|end time/i, "time"],
  [/before the lesson date|\bdate\b/i, "date"],
  [/Enrollment|does not teach this instrument|(Student|Teacher|Instrument) is not active/i, "enrollment"],
];

export function apiErrorField(error: unknown): ApiErrorField | null {
  if (!(error instanceof ApiError)) return null;
  if (error.code === "SCHEDULE_CONFLICT") return "time";
  return FIELD_BY_DETAIL.find(([pattern]) => pattern.test(error.detail ?? ""))?.[1] ?? null;
}

export function apiErrorKey<K extends ApiErrorField>(error: unknown, fields: readonly K[]): K | "form" {
  const field = apiErrorField(error);
  return field && (fields as readonly ApiErrorField[]).includes(field) ? (field as K) : "form";
}
