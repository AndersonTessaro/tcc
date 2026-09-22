import { lessonErrorMessage, localIsoDate, oneHourAfter, validateLessonForm } from "../lessonForm";

const valid = { enrollmentId: "e1", date: "2026-09-22", startTime: "10:00", endTime: "11:00" };

describe("lessonForm", () => {
  it("formats the local date instead of the UTC one", () => {
    expect(localIsoDate(new Date(2026, 8, 22, 23, 30))).toBe("2026-09-22");
  });

  it("suggests an end time one hour after the start, clamped before midnight", () => {
    expect(oneHourAfter("10:30")).toBe("11:30");
    expect(oneHourAfter("23:15")).toBe("23:59");
    expect(oneHourAfter("abc")).toBe("");
  });

  it("accepts a complete lesson", () => {
    expect(validateLessonForm(valid)).toBeNull();
  });

  it("requires a selected enrollment", () => {
    expect(validateLessonForm({ ...valid, enrollmentId: "" })).toBe("Selecione o aluno");
  });

  it("rejects an end time that is not after the start", () => {
    expect(validateLessonForm({ ...valid, endTime: "10:00" })).toBe("O fim deve ser depois do início");
  });

  it("rejects malformed times", () => {
    expect(validateLessonForm({ ...valid, startTime: "9h" })).toBe("Horário inválido (HH:MM)");
  });

  it("translates schedule conflicts", () => {
    expect(lessonErrorMessage(new Error("HTTP_409"))).toMatch(/Conflito/);
    expect(lessonErrorMessage(new Error("boom"))).toBe("Erro ao registrar aula");
  });
});
