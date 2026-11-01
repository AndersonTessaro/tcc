import { describe, expect, it } from "vitest";
import { AccessProfile, accessProfileLabel, canAccessAdmin, isSystemAdmin } from "./accessProfile";

describe("accessProfileLabel", () => {
  it("traduz os perfis oficiais definidos pelo enum", () => {
    expect(accessProfileLabel(AccessProfile.ADMINISTRADOR)).toBe("Administrador do sistema");
    expect(accessProfileLabel(AccessProfile.MANAGER)).toBe("Gestor da escola");
    expect(accessProfileLabel(AccessProfile.PROFESSOR)).toBe("Professor");
    expect(accessProfileLabel(AccessProfile.ALUNO)).toBe("Aluno");
  });

  it("preserva perfis legados ou personalizados", () => {
    expect(accessProfileLabel("MONITOR")).toBe("MONITOR");
  });
});

describe("administration access", () => {
  it("requires an explicit ADMIN or MANAGER role", () => {
    expect(canAccessAdmin(["ROLE_ADMIN"])).toBe(true);
    expect(canAccessAdmin(["ROLE_MANAGER"])).toBe(true);
    expect(canAccessAdmin(["ROLE_TEACHER", "auth.user.manage", "auth.role.manage"])).toBe(false);
    expect(canAccessAdmin(["ROLE_STUDENT"])).toBe(false);
    expect(isSystemAdmin(["ROLE_MANAGER", "school.manage"])).toBe(false);
    expect(isSystemAdmin(["ROLE_ADMIN"])).toBe(true);
  });
});
