export const AccessProfile = {
  ADMINISTRADOR: "ADMIN",
  PROFESSOR: "TEACHER",
  ALUNO: "STUDENT",
} as const;

export type AccessProfile = (typeof AccessProfile)[keyof typeof AccessProfile];

const ACCESS_PROFILE_LABELS: Record<AccessProfile, string> = {
  [AccessProfile.ADMINISTRADOR]: "Administrador",
  [AccessProfile.PROFESSOR]: "Professor",
  [AccessProfile.ALUNO]: "Aluno",
};

export function accessProfileLabel(profile: string) {
  return ACCESS_PROFILE_LABELS[profile as AccessProfile] ?? profile;
}
