import { useState } from "react";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { adminService } from "../adminService";
import { Button, Card, Drawer, Field, Input, PageHeader } from "@/components/ui";
import { ListState } from "../components/ListState";
import { useAdminList } from "../hooks/useAdminList";
import { useCreateDrawer } from "../hooks/useCreateDrawer";

export default function Settings() {
  const { data: items, loading, error, reload } = useAdminList(adminService.settings, [], "Erro ao carregar configurações");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const creating = useCreateDrawer();

  const save = async (key: string, description?: string | null) => {
    try {
      await adminService.upsertSetting(key, drafts[key] ?? items.find((item) => item.key === key)?.value ?? "", description ?? undefined);
      toast.success("Configuração salva");
      await reload();
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "Erro ao salvar"));
    }
  };

  return (
    <>
      <PageHeader title="Configurações" count={loading ? undefined : `${items.length}`}
        description="Valores gerais da escola usados pelo sistema." actions={<Button onClick={creating.show}>Nova configuração</Button>} />
      <Card>
        <ListState loading={loading} error={error} empty={!items.length} emptyMessage="Nenhuma configuração ainda." />
        {!loading && !error && items.length > 0 && (
          <ul className="divide-y divide-line">
            {items.map((s) => {
              const value = drafts[s.key] ?? s.value;
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-4 px-4 py-4">
                  <div className="min-w-48 flex-1">
                    <p className="font-semibold text-ink">{s.description || s.key}</p>
                    <code className="text-xs text-ink-faint">{s.key}</code>
                  </div>
                  <Input aria-label={`Valor de ${s.key}`} className="max-w-xs" value={value}
                    onChange={(event) => setDrafts({ ...drafts, [s.key]: event.target.value })} />
                  <Button variant="secondary" disabled={value === s.value} onClick={() => save(s.key, s.description)}>Salvar</Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Drawer open={creating.open} title="Nova configuração" onClose={creating.hide}>
        <SettingForm onSaved={async () => { creating.hide(); await reload(); }} />
      </Drawer>
    </>
  );
}

function SettingForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!key.trim() || !value.trim()) return;
    setSaving(true);
    try {
      await adminService.upsertSetting(key.trim(), value.trim(), description.trim() || undefined);
      toast.success("Configuração criada");
      await onSaved();
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "Erro ao criar"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={create}>
      <fieldset disabled={saving} className="space-y-4">
        <Field label="Chave" hint="Identificador usado pelo sistema, por exemplo school.name.">
          <Input required autoComplete="off" spellCheck={false} value={key} onChange={(event) => setKey(event.target.value)} />
        </Field>
        <Field label="Valor">
          <Input required value={value} onChange={(event) => setValue(event.target.value)} />
        </Field>
        <Field label="Descrição (opcional)" hint="Aparece como título na lista.">
          <Input value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        <Button type="submit" className="w-full" disabled={saving}>{saving ? "Salvando…" : "Criar configuração"}</Button>
      </fieldset>
    </form>
  );
}
