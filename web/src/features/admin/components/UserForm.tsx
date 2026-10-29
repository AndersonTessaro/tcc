import { useState } from "react";
import { toast } from "sonner";
import { Button, Field, Input } from "@/components/ui";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import type { InstrumentOption, NewUser } from "../adminService";
import { InstrumentChecklist } from "./InstrumentChecklist";

const EMPTY_USER: NewUser = { username: "", email: "", password: "", name: "" };

const FIELDS = [
  { key: "name", title: "Nome", type: "text", maxLength: 150, autoComplete: "off", hint: undefined },
  { key: "username", title: "Usuário", type: "text", maxLength: 100, autoComplete: "off", hint: "Usado para entrar no app." },
  { key: "email", title: "E-mail", type: "email", maxLength: 255, autoComplete: "off", hint: undefined },
  { key: "password", title: "Senha", type: "password", maxLength: undefined, autoComplete: "new-password",
    hint: "Senha inicial, com pelo menos 8 caracteres." },
] as const;

export function UserForm({ label, onSubmit, onDone, instruments }: {
  label: string;
  onSubmit: (user: NewUser, instrumentIds: string[]) => Promise<unknown>;
  onDone?: () => void;
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
      toast.success(`${label} cadastrado`);
      setUser(EMPTY_USER);
      setInstrumentIds([]);
      onDone?.();
    } catch (error) {
      toast.error(apiErrorMessage(error, `Erro ao cadastrar ${label.toLowerCase()}`));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save}>
      <fieldset disabled={saving} className="space-y-4">
        {FIELDS.map(({ key, title, type, maxLength, autoComplete, hint }) => (
          <Field key={key} label={title} hint={hint}>
            <Input type={type} required maxLength={maxLength} autoComplete={autoComplete}
              minLength={key === "password" ? 8 : undefined} value={user[key]}
              onChange={(event) => setUser({ ...user, [key]: event.target.value })} />
          </Field>
        ))}
        {instruments && <InstrumentChecklist instruments={instruments} selected={instrumentIds} onChange={setInstrumentIds} />}
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Salvando…" : `Cadastrar ${label.toLowerCase()}`}
        </Button>
      </fieldset>
    </form>
  );
}
