import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../useAuth";
import { Button, Field, Input } from "@/components/ui";
import { AuthShell } from "./AuthShell";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [l, setL] = useState("");
  const [s, setS] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(l, s);
      navigate("/", { replace: true });
    } catch (err) {
      // HTTP_401 = credenciais erradas; qualquer outro erro (rede/CORS/servidor) é de conexão.
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        msg.includes("401") || msg === "UNAUTHENTICATED"
          ? "Login ou senha inválidos"
          : "Falha ao conectar ao servidor",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Entrar" subtitle="Administração da escola">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Usuário ou e-mail">
          <Input placeholder="E-mail ou usuário" autoCapitalize="none" autoComplete="username" spellCheck={false}
            required value={l} onChange={(e) => setL(e.target.value)} />
        </Field>
        <Field label="Senha">
          <Input placeholder="Senha" type="password" autoComplete="current-password" required value={s}
            onChange={(e) => setS(e.target.value)} />
        </Field>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </Button>
      </form>
      <Link to="/forgot" className="mt-5 block text-center text-sm font-semibold text-primary hover:underline">
        Esqueci a senha
      </Link>
    </AuthShell>
  );
}
