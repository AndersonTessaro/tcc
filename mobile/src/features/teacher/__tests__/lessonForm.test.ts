import { addMonths, localIsoDate, oneHourAfter, validateDate, validateLessonForm, validateRepeatUntil } from "../lessonForm";

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

  it("rejects lesson ends at or beyond midnight", () => {
    expect(validateLessonForm({ ...valid, startTime: "23:00", endTime: "24:00" })).toBe("Horário inválido (HH:MM)");
    expect(validateLessonForm({ ...valid, startTime: "23:30", endTime: "24:30" })).toBe("Horário inválido (HH:MM)");
  });

  it("rejects malformed times", () => {
    expect(validateLessonForm({ ...valid, startTime: "9h" })).toBe("Horário inválido (HH:MM)");
  });

  it("rejects impossible calendar dates", () => {
    expect(validateDate("2026-02-30")).toBe("Data inválida (AAAA-MM-DD)");
    expect(validateDate("2028-02-29")).toBeNull();
  });

  it("adds months keeping the day and clamping to the end of a shorter month", () => {
    expect(addMonths("2026-11-14", 3)).toBe("2027-02-14");
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-12-15", 12)).toBe("2027-12-15");
  });

  it("accepts a repetition end between the first lesson and twelve months later", () => {
    expect(validateRepeatUntil("2026-11-14", "2026-11-14")).toBeNull();
    expect(validateRepeatUntil("2026-11-14", "2027-11-14")).toBeNull();
  });

  it("rejects a repetition end before the first lesson, beyond twelve months or malformed", () => {
    expect(validateRepeatUntil("2026-11-14", "2026-11-13")).toBe("Escolha uma data depois da primeira aula");
    expect(validateRepeatUntil("2026-11-14", "2027-11-15")).toBe("A repetição vai até 12 meses");
    expect(validateRepeatUntil("2026-11-14", "2026-02-30")).toBe("Data inválida (AAAA-MM-DD)");
  });
});
