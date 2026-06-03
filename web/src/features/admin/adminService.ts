import { api } from "@/lib/http";

export type Permission = { id: number; name: string; description: string };
export type RoleDto = { id: number; name: string; description: string; permissions: Permission[] };
export type UserDto = {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  active: boolean;
  roles: RoleDto[];
};

export const adminService = {
  users: () => api.get<UserDto[]>("/admin/security/users"),
  roles: () => api.get<RoleDto[]>("/admin/security/roles"),
  permissions: () => api.get<Permission[]>("/admin/security/permissions"),
  setRoles: (userId: string, roleIds: number[]) =>
    api.put<UserDto>(`/admin/security/users/${userId}/roles`, { roleIds }),
  setStatus: (userId: string, active: boolean) =>
    api.put<void>(`/admin/security/users/${userId}/status`, { active }),
  resetPassword: (userId: string, newPassword: string) =>
    api.put<void>(`/admin/security/users/${userId}/password`, { newPassword }),
  createRole: (name: string, description: string) =>
    api.post<RoleDto>("/admin/security/roles", { name, description }),
  setPermissions: (roleId: number, permissionIds: number[]) =>
    api.put<RoleDto>(`/admin/security/roles/${roleId}/permissions`, { permissionIds }),
  // registrations (Plan 2)
  createInstrument: (name: string) => api.post<{ id: string }>("/admin/instruments", { name }),
  createStudent: (b: NewUser) => api.post<{ id: string }>("/admin/students", b),
  createTeacher: (b: NewUser) => api.post<{ id: string }>("/admin/teachers", b),
  createEnrollment: (b: { studentId: string; teacherId: string; instrumentId: string }) =>
    api.post<{ id: string }>("/admin/enrollments", b),
};

export type NewUser = { username: string; email: string; password: string; name: string };
