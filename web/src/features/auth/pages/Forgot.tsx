import { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../authService";
import { Button, Card, Input } from "@/components/ui";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await authService.forgot(email).catch(() => {});
    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-6 text-xl font-bold text-gray-900">Recuperar senha</h1>
        {sent ? (
          <p className="text-sm text-accent">Se o e-mail existir, enviamos as instruções.</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <Input placeholder="E-mail" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" className="w-full">
              Enviar
            </Button>
          </form>
        )}
        <Link to="/login" className="mt-4 block text-center text-sm text-primary">
          Voltar ao login
        </Link>
      </Card>
    </div>
  );
}
