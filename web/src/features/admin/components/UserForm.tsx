import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, Input } from "@/components/ui";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import type { InstrumentOption, NewUser } from "../adminService";
import { InstrumentChecklist } from "./InstrumentChecklist";

const EMPTY_USER: NewUser = { username: "", email: "", password: "", name: "" };

export function UserForm({ label, onSubmit, instruments }: {
  label: string;
  onSubmit: (user: NewUser, instrumentIds: string[]) => Promise<unknown>;
  instruments?: InstrumentOption[];
}) {
  const [user, setUser] = useState(EMPTY_USER);
  const [instrumentIds, setInstrumentIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(user, instrumentIds);
      toast.success(`${label} criado`);
      setUser(EMPTY_USER);
      setInstrumentIds([]);
    } catch (error) {
      toast.error(apiErrorMessage(error, `Erro ao criar ${label.toLowerCase()}`));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <p className="mb-3 font-medium">Novo {label.toLowerCase()}</p>
      <form onSubmit={save} className="space-y-2">
        <fieldset disabled={saving} className="space-y-2">
          {([
            ["username", "Usuário", "text", 100], ["email", "E-mail", "email", 255],
            ["password", "Senha", "password", undefined], ["name", "Nome", "text", 150],
          ] as const).map(([key, title, type, maxLength]) => (
            <label key={key} className="block text-sm text-gray-700">
              {title}
              <Input className="mt-1" placeholder={title} type={type} required maxLength={maxLength}
                minLength={key === "password" ? 8 : undefined} value={user[key]}
                onChange={(event) => setUser({ ...user, [key]: event.target.value })} />
            </label>
          ))}
          {instruments && <InstrumentChecklist instruments={instruments} selected={instrumentIds} onChange={setInstrumentIds} />}
          <Button type="submit" disabled={saving}>Criar {label.toLowerCase()}</Button>
        </fieldset>
      </form>
    </Card>
  );
}
