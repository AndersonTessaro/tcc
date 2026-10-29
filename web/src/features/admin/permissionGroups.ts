import type { Permission } from "./adminService";

const DOMAIN_LABELS: Record<string, string> = {
  attendance: "Frequência",
  auth: "Acesso ao sistema",
  classgroup: "Turmas",
  config: "Configurações",
  enrollment: "Matrículas",
  finance: "Financeiro",
  goal: "Metas",
  instrument: "Instrumentos",
  lesson: "Aulas",
  material: "Materiais",
  note: "Anotações",
  practice: "Prática",
  progress: "Progresso",
  report: "Relatórios",
  student: "Alunos",
  teacher: "Professores",
};

export function groupPermissions(permissions: Permission[]) {
  const groups = new Map<string, Permission[]>();
  for (const permission of permissions) {
    const domain = permission.name.split(".")[0];
    groups.set(domain, [...(groups.get(domain) ?? []), permission]);
  }
  return [...groups.entries()]
    .map(([domain, items]) => ({ domain, label: DOMAIN_LABELS[domain] ?? domain, items }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}
