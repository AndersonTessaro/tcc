import { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../authService";
import { Button, Field, Input } from "@/components/ui";
import { AuthShell } from "./AuthShell";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await authService.forgot(email).catch(() => {});
    setSent(true);
  };

  return (
    <AuthShell title="Recuperar senha" subtitle="Enviamos um link para redefinir a senha do e-mail cadastrado.">
      {sent ? (
        <p role="status" className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success">
          Se o e-mail estiver cadastrado, as instruções chegam em alguns minutos.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="E-mail">
            <Input placeholder="E-mail" type="email" autoCapitalize="none" autoComplete="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full">Enviar link</Button>
        </form>
      )}
      <Link to="/login" className="mt-5 block text-center text-sm font-semibold text-primary hover:underline">
        Voltar ao login
      </Link>
    </AuthShell>
  );
}
