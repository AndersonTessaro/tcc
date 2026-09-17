import { describe, expect, it } from "vitest";
import { AccessProfile, accessProfileLabel } from "./accessProfile";

describe("accessProfileLabel", () => {
  it("traduz os perfis oficiais definidos pelo enum", () => {
    expect(accessProfileLabel(AccessProfile.ADMINISTRADOR)).toBe("Administrador");
    expect(accessProfileLabel(AccessProfile.PROFESSOR)).toBe("Professor");
    expect(accessProfileLabel(AccessProfile.ALUNO)).toBe("Aluno");
  });

  it("preserva perfis legados ou personalizados", () => {
    expect(accessProfileLabel("MONITOR")).toBe("MONITOR");
  });
});
