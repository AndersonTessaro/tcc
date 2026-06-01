import { api } from "@/lib/http";

export type Permissao = { id: number; name: string; description: string };
export type RoleDto = { id: number; name: string; description: string; permissions: Permissao[] };
export type UsuarioDto = {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  ativo: boolean;
  roles: RoleDto[];
};

export const adminService = {
  usuarios: () => api.get<UsuarioDto[]>("/admin/security/usuarios"),
  roles: () => api.get<RoleDto[]>("/admin/security/roles"),
  permissoes: () => api.get<Permissao[]>("/admin/security/permissoes"),
  setRoles: (userId: string, roleIds: number[]) =>
    api.put<UsuarioDto>(`/admin/security/usuarios/${userId}/roles`, { roleIds }),
  setStatus: (userId: string, ativo: boolean) =>
    api.put<void>(`/admin/security/usuarios/${userId}/status`, { ativo }),
  resetSenha: (userId: string, novaSenha: string) =>
    api.put<void>(`/admin/security/usuarios/${userId}/senha`, { novaSenha }),
  criarRole: (name: string, description: string) =>
    api.post<RoleDto>("/admin/security/roles", { name, description }),
  setPerms: (roleId: number, permissionIds: number[]) =>
    api.put<RoleDto>(`/admin/security/roles/${roleId}/permissoes`, { permissionIds }),
  // cadastros (Plano 2)
  criarInstrumento: (nome: string) => api.post<{ id: string }>("/admin/instrumentos", { nome }),
  criarAluno: (b: NovoUsuario) => api.post<{ id: string }>("/admin/alunos", b),
  criarProfessor: (b: NovoUsuario) => api.post<{ id: string }>("/admin/professores", b),
  criarMatricula: (b: { alunoId: string; professorId: string; instrumentoId: string }) =>
    api.post<{ id: string }>("/admin/matriculas", b),
};

export type NovoUsuario = { username: string; email: string; senha: string; nome: string };
