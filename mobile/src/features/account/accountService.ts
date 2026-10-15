import { api } from "@/lib/http";

export type Account = {
  username: string;
  email: string;
  displayName: string;
  roles: string[];
  teacher: { bio: string | null; instruments: { id: string; name: string }[] } | null;
};

export const accountService = {
  get: () => api.get<Account>("/account"),
  update: (body: { displayName: string; bio?: string }) => api.put<Account>("/account", body),
  changePassword: (body: { currentPassword: string; newPassword: string }) => api.put<void>("/account/password", body),
};
