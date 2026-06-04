import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../useAuth";
import { Button, Card, Input } from "@/components/ui";

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
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">Harmonia</h1>
        <p className="mb-6 text-sm text-gray-500">Configurador administrativo</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <Input placeholder="E-mail ou usuário" autoCapitalize="none" value={l} onChange={(e) => setL(e.target.value)} />
          <Input placeholder="Senha" type="password" value={s} onChange={(e) => setS(e.target.value)} />
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <Link to="/forgot" className="mt-4 block text-center text-sm text-primary">
          Esqueci a senha
        </Link>
      </Card>
    </div>
  );
}
