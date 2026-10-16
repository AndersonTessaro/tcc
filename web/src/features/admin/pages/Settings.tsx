import { useState } from "react";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { adminService } from "../adminService";
import { Button, Card, Input, PageTitle } from "@/components/ui";
import { ListState } from "../components/ListState";
import { useAdminList } from "../hooks/useAdminList";

export default function Settings() {
  const { data: items, loading, error, reload: load } = useAdminList(adminService.settings, [], "Erro ao carregar configurações");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const save = async (key: string, description?: string | null) => {
    try {
      await adminService.upsertSetting(key, drafts[key] ?? items.find((item) => item.key === key)?.value ?? "", description ?? undefined);
      toast.success("Configuração salva");
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Erro ao salvar"));
    }
  };

  const create = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    try {
      await adminService.upsertSetting(newKey.trim(), newValue.trim(), newDesc.trim() || undefined);
      toast.success("Configuração criada");
      setNewKey("");
      setNewValue("");
      setNewDesc("");
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Erro ao criar"));
    }
  };

  return (
    <div>
      <PageTitle>Configurações</PageTitle>

      <Card className="mb-6">
        <p className="mb-3 font-medium">Nova configuração</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input aria-label="Chave" className="max-w-[200px]" placeholder="chave (ex: school.name)" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
          <Input aria-label="Valor" className="max-w-[200px]" placeholder="valor" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
          <Input aria-label="Descrição (opcional)" className="max-w-xs" placeholder="descrição (opcional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          <Button onClick={create}>Criar</Button>
        </div>
      </Card>

      <ListState loading={loading} error={error} empty={!items.length} emptyMessage="Nenhuma configuração ainda." />
      {!loading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map((s) => (
            <Card key={s.id}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-[180px]">
                  <p className="font-mono text-sm font-semibold">{s.key}</p>
                  {s.description ? <p className="text-xs text-gray-500">{s.description}</p> : null}
                </div>
                <Input
                  aria-label={`Valor de ${s.key}`}
                  className="max-w-xs"
                  value={drafts[s.key] ?? s.value}
                  onChange={(e) => setDrafts({ ...drafts, [s.key]: e.target.value })}
                />
                <Button variant="ghost" onClick={() => save(s.key, s.description)}>
                  Salvar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
