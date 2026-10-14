import { ApiError } from "@/lib/http/apiError";

export type StudentFormValues = {
  name: string;
  email: string;
  username: string;
  password: string;
  phone: string;
  instrumentId: string;
  sharedNotes: string;
  privateNotes: string;
};
export const FIELDS = ["name", "email", "username", "password", "phone", "instrument", "sharedNotes", "privateNotes"] as const;
export type StudentFormField = typeof FIELDS[number];
export type StudentFormErrors = Partial<Record<StudentFormField, string>>;
export type StudentFormMode = "create" | "edit";

export function validateStudentForm(values: StudentFormValues, mode: StudentFormMode): StudentFormErrors {
  const errors: StudentFormErrors = {};
  if (!values.name.trim()) errors.name = "Informe o nome.";
  else if (values.name.trim().length > 150) errors.name = "Use até 150 caracteres no nome.";
  if (mode === "create") {
    const email = values.email.trim();
    if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Informe um e-mail válido.";
    const username = values.username.trim();
    if (!username || username.length > 100 || /\s/.test(username)) errors.username = "Usuário sem espaços, até 100 caracteres.";
    if (!values.password.trim() || values.password.length < 8 || new TextEncoder().encode(values.password).length > 72) errors.password = "A senha precisa de 8 a 72 caracteres.";
    if (!values.instrumentId) errors.instrument = "Escolha o instrumento.";
  }
  if (values.phone.trim() && !/^[0-9()+\- ]{8,20}$/.test(values.phone.trim())) errors.phone = "Telefone inválido.";
  if (values.sharedNotes.trim().length > 1000) errors.sharedNotes = "Use até 1000 caracteres na observação.";
  if (values.privateNotes.trim().length > 1000) errors.privateNotes = "Use até 1000 caracteres nas anotações.";
  return errors;
}

export function fieldFromApiError(error: unknown): StudentFormField | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status === 409 && error.code === "DUPLICATE_RESOURCE") {
    if (/Email already in use/i.test(error.detail ?? "")) return "email";
    if (/Username already in use/i.test(error.detail ?? "")) return "username";
  }
  if (/does not teach this instrument/i.test(error.detail ?? "")) return "instrument";
  return null;
}
