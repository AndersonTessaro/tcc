export const AccessProfile = {
  ADMINISTRADOR: "ADMIN",
  MANAGER: "MANAGER",
  PROFESSOR: "TEACHER",
  ALUNO: "STUDENT",
} as const;

export type AccessProfile = (typeof AccessProfile)[keyof typeof AccessProfile];

const ACCESS_PROFILE_LABELS: Record<AccessProfile, string> = {
  [AccessProfile.ADMINISTRADOR]: "Administrador do sistema",
  [AccessProfile.MANAGER]: "Gestor da escola",
  [AccessProfile.PROFESSOR]: "Professor",
  [AccessProfile.ALUNO]: "Aluno",
};

export function accessProfileLabel(profile: string) {
  return ACCESS_PROFILE_LABELS[profile as AccessProfile] ?? profile;
}

export const ADMIN_PANEL_ROLES = ["ROLE_ADMIN", "ROLE_MANAGER"];

export const canAccessAdmin = (authorities: string[]) => authorities.some((authority) => ADMIN_PANEL_ROLES.includes(authority));

export const isSystemAdmin = (authorities: string[]) => authorities.includes("ROLE_ADMIN");
