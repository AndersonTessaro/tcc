import { ApiError } from "./apiError";
import { RequestTimeoutError } from "./apiClient";

const BY_CODE: Record<string, string> = {
  FILE_TOO_LARGE: "Arquivo maior que 50 MB",
  SCHEDULE_CONFLICT: "Conflito de horário com outra aula ou horário fixo",
  DUPLICATE_RESOURCE: "Já existe um cadastro com esses dados",
  VALIDATION: "Dados inválidos. Revise os campos.",
  INVALID_RESET_TOKEN: "Link de recuperação inválido ou expirado. Solicite outro link.",
  NOT_FOUND: "Registro não encontrado",
  OWNERSHIP_DENIED: "Sem permissão para acessar este registro",
  ACCESS_DENIED: "Sem permissão para esta ação",
  INVALID_MAKEUP_LINK: "Esta aula não pode receber reposição",
  PROFILE_REQUIRED: "Esta ação exige um perfil de professor ou aluno",
  STORAGE_UNAVAILABLE: "Armazenamento indisponível. Tente novamente em instantes.",
};

// Backend domain messages are in English; only the ones a user can trigger are translated.
const BY_DETAIL: [RegExp, string][] = [
  [/Email already in use/i, "Este e-mail já está em uso."],
  [/Username already in use/i, "Este usuário já está em uso."],
  [/Recording must be an audio or video file/i, "Escolha um arquivo de áudio ou vídeo."],
  [/Recording is empty/i, "O arquivo está vazio."],
  [/Recording exceeds 50 MB/i, "O arquivo passa de 50 MB. Grave um vídeo mais curto ou envie só o áudio."],
  [/Canceled lessons cannot be edited/i, "Aula cancelada não pode ser editada."],
  [/Only scheduled lessons can be rescheduled/i, "Só aulas agendadas podem mudar de data ou horário."],
  [/Lesson cannot be moved to a past date/i, "A aula não pode ir para uma data passada."],
  [/Lesson with recorded attendance cannot be rescheduled/i, "Aula com frequência registrada não pode mudar de data ou horário."],
  [/Attachment must be a PDF, image, audio or video file/i, "Escolha um PDF, imagem, áudio ou vídeo."],
  [/Attachment is empty/i, "O arquivo está vazio."],
  [/Attachment exceeds 50 MB/i, "O arquivo passa de 50 MB."],
  [/Lesson already has 10 attachments/i, "A aula já tem 10 anexos."],
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
  if (error instanceof RequestTimeoutError) return "O servidor demorou para responder. Tente novamente.";
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
