import { useState } from "react";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { adminService } from "../adminService";
import type { Permission, RoleDto } from "../adminService";
import { accessProfileLabel } from "../accessProfile";
import { Button, Card, Drawer, Field, Input, PageHeader, Table, cell } from "@/components/ui";
import { ListState } from "../components/ListState";
import { useAdminList } from "../hooks/useAdminList";
import { useCreateDrawer } from "../hooks/useCreateDrawer";
import { groupPermissions } from "../permissionGroups";

const COLUMNS = [
  { label: "Perfil" }, { label: "Descrição" }, { label: "Permissões", align: "right" as const }, { label: "Ações", align: "right" as const },
];

const loadRoles = async () => {
  const [roles, perms] = await Promise.all([adminService.roles(), adminService.permissions()]);
  return { roles, perms };
};

export default function Roles() {
  const { data: { roles, perms }, loading, error, reload } = useAdminList(loadRoles,
    { roles: [], perms: [] }, "Erro ao carregar perfis de acesso");
  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = roles.find((role) => role.id === editingId) ?? null;
  const creating = useCreateDrawer();

  return (
    <>
      <PageHeader title="Perfis de acesso" count={loading ? undefined : `${roles.length}`}
        description="Cada perfil reúne um conjunto de permissões. Um usuário pode ter mais de um perfil."
        actions={<Button onClick={creating.show}>Novo perfil</Button>} />
      <Card>
        <ListState loading={loading} error={error} empty={!roles.length} emptyMessage="Nenhum perfil encontrado" />
        {!loading && !error && roles.length > 0 && (
          <Table columns={COLUMNS}>
            {roles.map((r) => (
              <tr key={r.id} className="hover:bg-canvas/60">
                <td className={`${cell} font-semibold text-ink`}>{accessProfileLabel(r.name)}</td>
                <td className={`${cell} text-ink-muted`}>{r.description}</td>
                <td className={`${cell} tabular text-right`}>{r.permissions.length} de {perms.length}</td>
                <td className={`${cell} text-right`}>
                  <Button variant="secondary" size="sm" aria-label={`Permissões de ${accessProfileLabel(r.name)}`}
                    onClick={() => setEditingId(r.id)}>Permissões</Button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Drawer open={editing !== null} title={`Permissões de ${editing ? accessProfileLabel(editing.name) : ""}`}
        description="As mudanças valem no próximo login de quem tem este perfil." onClose={() => setEditingId(null)}>
        {editing && <RolePermissions role={editing} permissions={perms} onChanged={reload} />}
      </Drawer>

      <Drawer open={creating.open} title="Novo perfil" description="Depois de criar, escolha as permissões do perfil."
        onClose={creating.hide}>
        <RoleForm onSaved={async () => { creating.hide(); await reload(); }} />
      </Drawer>
    </>
  );
}

function RolePermissions({ role, permissions, onChanged }: {
  role: RoleDto;
  permissions: Permission[];
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const toggle = async (permId: number) => {
    const current = new Set(role.permissions.map((p) => p.id));
    if (current.has(permId)) current.delete(permId);
    else current.add(permId);
    setBusy(true);
    try {
      await adminService.setPermissions(role.id, [...current]);
      toast.success("Permissões atualizadas");
      await onChanged();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Erro ao atualizar permissões"));
    } finally {
      setBusy(false);
    }
  };

  if (!permissions.length) return <p className="text-sm text-ink-muted">Nenhuma permissão encontrada</p>;
  return (
    <fieldset disabled={busy} className="space-y-6">
      {groupPermissions(permissions).map((group) => (
        <section key={group.domain}>
          <h3 className="mb-1 text-sm font-bold text-ink">{group.label}</h3>
          {group.items.map((p) => (
            <label key={p.id} className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-canvas">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary"
                checked={role.permissions.some((x) => x.id === p.id)} onChange={() => void toggle(p.id)} />
              <span>
                <span className="block text-sm text-ink">{p.description}</span>
                <code className="block text-xs text-ink-faint">{p.name}</code>
              </span>
            </label>
          ))}
        </section>
      ))}
    </fieldset>
  );
}

function RoleForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !description.trim()) return;
    setSaving(true);
    try {
      await adminService.createRole(name.trim(), description.trim());
      toast.success("Perfil de acesso criado");
      await onSaved();
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "Erro ao criar perfil de acesso"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={create}>
      <fieldset disabled={saving} className="space-y-4">
        <Field label="Nome do perfil" hint="Em maiúsculas e sem espaços, por exemplo MONITOR.">
          <Input required maxLength={50} value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Descrição">
          <Input required maxLength={255} value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        <Button type="submit" className="w-full" disabled={saving}>{saving ? "Salvando…" : "Criar perfil"}</Button>
      </fieldset>
    </form>
  );
}
