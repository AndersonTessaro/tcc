import { ApiError } from "@/lib/http/apiError";
import { FIELDS, fieldFromApiError, validateStudentForm, type StudentFormValues } from "../studentForm";

const valid: StudentFormValues = { name: "Ana", email: "ana@example.com", username: "ana", password: "Senha123", phone: "", instrumentId: "i1", sharedNotes: "", privateNotes: "" };

it("accepts complete creation and validates only editable fields in edit mode", () => {
  expect(validateStudentForm(valid, "create")).toEqual({});
  expect(validateStudentForm({ ...valid, email: "", username: "", password: "", instrumentId: "" }, "edit")).toEqual({});
});
it.each([
  ["name", " ", "Informe o nome."],
  ["name", "a".repeat(151), "Use até 150 caracteres no nome."],
  ["email", "a@", "Informe um e-mail válido."],
  ["email", "a".repeat(244) + "@example.com", "Informe um e-mail válido."],
  ["username", "ana silva", "Usuário sem espaços, até 100 caracteres."],
  ["username", "", "Usuário sem espaços, até 100 caracteres."],
  ["username", "a".repeat(101), "Usuário sem espaços, até 100 caracteres."],
  ["password", "1234567", "A senha precisa de 8 a 72 caracteres."],
  ["password", " ".repeat(8), "A senha precisa de 8 a 72 caracteres."],
  ["password", "á".repeat(37), "A senha precisa de 8 a 72 caracteres."],
  ["phone", "123", "Telefone inválido."],
  ["phone", "abcdefgh", "Telefone inválido."],
  ["phone", "1".repeat(21), "Telefone inválido."],
  ["instrumentId", "", "Escolha o instrumento."],
  ["sharedNotes", "a".repeat(1001), "Use até 1000 caracteres na observação."],
  ["privateNotes", "a".repeat(1001), "Use até 1000 caracteres nas anotações."],
] as const)("validates %s", (field, value, message) => {
  const errors = validateStudentForm({ ...valid, [field]: value }, "create");
  expect(errors[field === "instrumentId" ? "instrument" : field]).toBe(message);
});
it("accepts exact limits, UTF-8 passwords and optional Brazilian phones", () => {
  expect(validateStudentForm({ ...valid, name: "a".repeat(150), username: "a".repeat(100), password: "á".repeat(36), phone: "+55 (45) 99999-1234", sharedNotes: "a".repeat(1000), privateNotes: "a".repeat(1000) }, "create")).toEqual({});
  expect(validateStudentForm({ ...valid, password: "😀".repeat(18) }, "create")).toEqual({});
  expect(validateStudentForm({ ...valid, password: "😀".repeat(19) }, "create").password).toBeDefined();
});
it("orders the first invalid field as shown on the form", () => {
  const errors = validateStudentForm({ ...valid, name: "", email: "", username: "", password: "", instrumentId: "" }, "create");
  expect(FIELDS.find(field => errors[field])).toBe("name");
  expect(FIELDS).toEqual(["name", "email", "username", "password", "phone", "instrument", "sharedNotes", "privateNotes"]);
});
it.each([
  [new ApiError(409, "DUPLICATE_RESOURCE", "Email already in use"), "email"],
  [new ApiError(409, "DUPLICATE_RESOURCE", "Username already in use"), "username"],
  [new ApiError(422, "DOMAIN_VALIDATION", "Teacher does not teach this instrument"), "instrument"],
  [new ApiError(422, "VALIDATION"), null],
  [new ApiError(403, "OWNERSHIP_DENIED"), null],
  [new Error("Email already in use"), null],
])("maps API errors to their fields", (error, field) => expect(fieldFromApiError(error)).toBe(field));
