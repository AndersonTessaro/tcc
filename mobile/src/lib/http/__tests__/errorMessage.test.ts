import { ApiError, toApiError } from "../apiError";
import { apiErrorField, apiErrorMessage } from "../errorMessage";

const response = (status: number, body: unknown) =>
  ({ status, json: () => Promise.resolve(body) }) as Response;

describe("apiErrorMessage", () => {
  it("reads the backend error code from the response body", async () => {
    const error = await toApiError(response(409, { code: "SCHEDULE_CONFLICT", message: "x" }));
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe("HTTP_409");
    expect(apiErrorMessage(error, "fallback")).toBe("Conflito de horário com outra aula ou horário fixo");
  });

  it("translates known domain validation messages", () => {
    const error = new ApiError(422, "DOMAIN_VALIDATION", "Attendance cannot be recorded for a canceled lesson");
    expect(apiErrorMessage(error, "fallback")).toBe("Aula cancelada não recebe frequência");
  });

  it("explains missing teacher instrument and missing profile", () => {
    expect(apiErrorMessage(new ApiError(422, "DOMAIN_VALIDATION", "Teacher does not teach this instrument"), "fb")).toBe(
      "O professor não ensina este instrumento",
    );
    expect(apiErrorMessage(new ApiError(403, "PROFILE_REQUIRED", "x"), "fb")).toBe(
      "Esta ação exige um perfil de professor ou aluno",
    );
  });

  it("uses a generic message for unknown domain rules", () => {
    expect(apiErrorMessage(new ApiError(422, "DOMAIN_VALIDATION", "Something else"), "fb")).toBe(
      "Operação não permitida",
    );
  });

  it("tolerates a body that is not JSON", async () => {
    const res = { status: 500, json: () => Promise.reject(new Error("bad json")) } as unknown as Response;
    const error = await toApiError(res);
    expect(error.code).toBeUndefined();
    expect(apiErrorMessage(error, "Erro ao salvar")).toBe("Erro ao salvar");
  });

  it("reports network failures and expired sessions", () => {
    expect(apiErrorMessage(new TypeError("Network request failed"), "fb")).toBe("Sem conexão com o servidor");
    expect(apiErrorMessage(new Error("UNAUTHENTICATED"), "fb")).toBe("Sessão expirada. Entre novamente.");
  });
});

describe("apiErrorField", () => {
  it("places schedule conflicts and time-range errors on the time fields", () => {
    expect(apiErrorField(new ApiError(409, "SCHEDULE_CONFLICT"))).toBe("time");
    expect(apiErrorField(new ApiError(422, "DOMAIN_VALIDATION", "End time must be after start time"))).toBe("time");
  });

  it("places date and enrollment rules on their fields", () => {
    expect(apiErrorField(new ApiError(422, "DOMAIN_VALIDATION", "Attendance cannot be recorded before the lesson date"))).toBe("date");
    expect(apiErrorField(new ApiError(422, "DOMAIN_VALIDATION", "Enrollment is not active"))).toBe("enrollment");
    expect(apiErrorField(new ApiError(422, "DOMAIN_VALIDATION", "Teacher does not teach this instrument"))).toBe("enrollment");
  });

  it("returns null for errors without a field", () => {
    expect(apiErrorField(new ApiError(404, "NOT_FOUND"))).toBeNull();
    expect(apiErrorField(new ApiError(422, "DOMAIN_VALIDATION", "Something else"))).toBeNull();
    expect(apiErrorField(new TypeError("Network request failed"))).toBeNull();
  });
});

describe("apiErrorKey", () => {
  it("falls back to the form slot when the screen has no field for the error", () => {
    const { apiErrorKey } = jest.requireActual("@/lib/http/errorMessage");
    const { ApiError } = jest.requireActual("@/lib/http/apiError");
    const conflict = new ApiError(409, "SCHEDULE_CONFLICT");
    expect(apiErrorKey(conflict, ["time"])).toBe("time");
    expect(apiErrorKey(conflict, ["date"])).toBe("form");
    expect(apiErrorKey(new Error("x"), ["time"])).toBe("form");
  });
});
