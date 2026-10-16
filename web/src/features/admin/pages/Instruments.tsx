import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, Input, PageTitle } from "@/components/ui";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { adminService } from "../adminService";
import { ListState } from "../components/ListState";
import { useAdminList } from "../hooks/useAdminList";

export default function Instruments() {
  const { data: instruments, loading, error, reload } = useAdminList(adminService.instruments, [], "Erro ao carregar instrumentos");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await adminService.createInstrument(name.trim());
      toast.success("Instrumento criado");
      setName("");
      await reload();
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "Erro ao criar instrumento"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageTitle>Instrumentos</PageTitle>
      <Card>
        <ListState loading={loading} error={error} empty={!instruments.length} emptyMessage="Nenhum instrumento encontrado" />
        {!loading && !error && <ul className="divide-y divide-gray-100">{instruments.map((instrument) => (
          <li key={instrument.id} className="py-3 text-sm">{instrument.name}</li>
        ))}</ul>}
      </Card>
      <Card>
        <p className="mb-3 font-medium">Novo instrumento</p>
        <form onSubmit={create} className="space-y-3">
          <label className="block text-sm text-gray-700">Nome do instrumento
            <Input className="mt-1" placeholder="Nome do instrumento" required maxLength={80} value={name}
              onChange={(event) => setName(event.target.value)} />
          </label>
          <Button type="submit" disabled={saving}>Criar instrumento</Button>
        </form>
      </Card>
    </div>
  );
}
