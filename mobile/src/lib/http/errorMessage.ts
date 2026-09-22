import { ApiError } from "./apiError";

const BY_CODE: Record<string, string> = {
  SCHEDULE_CONFLICT: "Conflito de horário com outra aula ou horário fixo",
  DUPLICATE_RESOURCE: "Já existe um cadastro com esses dados",
  VALIDATION: "Dados inválidos. Revise os campos.",
  NOT_FOUND: "Registro não encontrado",
  OWNERSHIP_DENIED: "Sem permissão para acessar este registro",
  ACCESS_DENIED: "Sem permissão para esta ação",
  INVALID_MAKEUP_LINK: "Esta aula não pode receber reposição",
};

// Backend domain messages are in English; only the ones a user can trigger are translated.
const BY_DETAIL: [RegExp, string][] = [
  [/canceled lesson/i, "Aula cancelada não recebe frequência"],
  [/before the lesson date/i, "A frequência só pode ser marcada a partir do dia da aula"],
  [/Enrollment is not active/i, "Matrícula inativa"],
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
