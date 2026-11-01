import { useState } from "react";
import { toast } from "sonner";
import { Badge, Button, Card, Drawer, Field, Input, PageHeader, Table, cell } from "@/components/ui";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { adminService } from "../adminService";
import type { SchoolDto, SchoolManagerDto } from "../adminService";
import { ListState } from "../components/ListState";
import { UserForm } from "../components/UserForm";
import { useAdminList } from "../hooks/useAdminList";
import { useCreateDrawer } from "../hooks/useCreateDrawer";

const COLUMNS = [{ label: "Nome" }, { label: "Gestores" }, { label: "Situação" }, { label: "Ações", align: "right" as const }];

export default function Schools() {
  const { data, loading, error, reload } = useAdminList(adminService.schools, [], "Erro ao carregar escolas");
  const creating = useCreateDrawer();
  const [editing, setEditing] = useState<SchoolDto | null>(null);
  const [managerSchool, setManagerSchool] = useState<SchoolDto | null>(null);
  const newButton = <Button onClick={creating.show}>Nova escola</Button>;
  const saved = async () => { creating.hide(); setEditing(null); await reload(); };

  return (
    <>
      <PageHeader title="Escolas" count={loading ? undefined : `${data.length}`}
        description="Cadastre escolas e os gestores responsáveis por cada uma." actions={newButton} />
      <Card>
        <ListState loading={loading} error={error} empty={!data.length} emptyMessage="Nenhuma escola encontrada" emptyAction={newButton} />
        {!loading && !error && data.length > 0 && <Table columns={COLUMNS}>
          {data.map((school) => (
            <tr key={school.id} className="hover:bg-canvas/60">
              <td className={`${cell} font-semibold text-ink`}>{school.name}</td>
              <td className={cell}><SchoolManagers managers={school.managers} /></td>
              <td className={cell}><Badge tone={school.active ? "success" : "neutral"}>{school.active ? "Ativa" : "Inativa"}</Badge></td>
              <td className={`${cell} text-right`}>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" aria-label={`Editar ${school.name}`} onClick={() => setEditing(school)}>Editar</Button>
                  <Button variant="secondary" size="sm" aria-label={`Criar gestor de ${school.name}`}
                    disabled={!school.active} onClick={() => setManagerSchool(school)}>Criar gestor</Button>
                </div>
              </td>
            </tr>
          ))}
        </Table>}
      </Card>
      <Drawer open={creating.open || editing !== null} title={editing ? "Editar escola" : "Nova escola"}
        onClose={() => { creating.hide(); setEditing(null); }}>
        <SchoolForm key={editing?.id ?? "new"} school={editing} onSaved={saved} />
      </Drawer>
      <Drawer open={managerSchool !== null} title="Criar gestor" description={managerSchool?.name} onClose={() => setManagerSchool(null)}>
        {managerSchool && <UserForm key={managerSchool.id} label="Gestor"
          onSubmit={(user) => adminService.createManager(managerSchool.id, user)} onDone={() => { setManagerSchool(null); void reload(); }} />}
      </Drawer>
    </>
  );
}

function SchoolManagers({ managers }: { managers: SchoolManagerDto[] }) {
  if (!managers.length) return <span className="text-sm text-ink-faint">Nenhum gestor</span>;
  return (
    <ul className="space-y-1">
      {managers.map((manager) => (
        <li key={manager.id} className="text-sm">
          <span className="font-medium text-ink">{manager.name ?? manager.username}</span>
          <span className="text-ink-muted"> · {manager.username}</span>
          {!manager.active && <span className="ml-2"><Badge>Inativo</Badge></span>}
        </li>
      ))}
    </ul>
  );
}

function SchoolForm({ school, onSaved }: { school: SchoolDto | null; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(school?.name ?? "");
  const [active, setActive] = useState(school?.active ?? true);
  const [saving, setSaving] = useState(false);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) { toast.error("Informe o nome da escola"); return; }
    if (school?.active && !active && !window.confirm(`Desativar ${school.name}? Gestores, professores e alunos desta escola não conseguirão mais entrar, e novos cadastros não poderão ser vinculados a ela.`)) return;
    setSaving(true);
    try {
      if (school) await adminService.updateSchool(school.id, { name: name.trim(), active });
      else await adminService.createSchool(name.trim());
      toast.success(school ? "Escola atualizada" : "Escola cadastrada");
      await onSaved();
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "Erro ao salvar escola"));
    } finally { setSaving(false); }
  };
  return (
    <form onSubmit={save}>
      <fieldset disabled={saving} className="space-y-4">
        <Field label="Nome da escola"><Input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></Field>
        {school && <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input type="checkbox" className="h-4 w-4 accent-primary" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Escola ativa
        </label>}
        <Button type="submit" className="w-full" disabled={saving}>{saving ? "Salvando…" : school ? "Salvar escola" : "Criar escola"}</Button>
      </fieldset>
    </form>
  );
}
