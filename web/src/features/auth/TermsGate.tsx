import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { authService, type Terms } from "./authService";
import { useAuth } from "./useAuth";
import { AuthShell } from "./pages/AuthShell";

const AGREEMENT = "Li e aceito os termos de uso e a política de privacidade";

export function TermsGate() {
  const { acceptTerms, logout } = useAuth();
  const [terms, setTerms] = useState<Terms | null>(null);
  const [loadError, setLoadError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoadError("");
    authService.terms().then(setTerms)
      .catch((cause: unknown) => setLoadError(apiErrorMessage(cause, "Não foi possível carregar os termos")));
  }, []);

  useEffect(load, [load]);

  const accept = async () => {
    if (!terms) return;
    setSaving(true);
    try {
      await authService.acceptTerms(terms.version);
      acceptTerms();
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "Não foi possível registrar o aceite"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthShell wide title="Termos de uso" subtitle="Para continuar usando o Sonetto, leia e aceite os termos abaixo.">
      {loadError && (
        <div role="alert" className="flex items-center gap-3 text-danger">
          {loadError}
          <Button variant="secondary" size="sm" onClick={load}>Tentar novamente</Button>
        </div>
      )}
      {!terms && !loadError && <p className="text-sm text-ink-faint">Carregando...</p>}
      {terms && (
        <div className="space-y-4">
          <article tabIndex={0} aria-label="Texto dos termos de uso"
            className="max-h-[50vh] space-y-2 overflow-y-auto rounded-lg bg-canvas p-4 text-sm leading-relaxed text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            {terms.text.split("\n").filter((line) => line.trim()).map((line, index) => line.startsWith("## ")
              ? <h2 key={index} className="pt-2 text-base font-bold">{line.slice(3)}</h2>
              : <p key={index}>{line}</p>)}
          </article>
          <label className="flex items-center gap-3 text-sm text-ink">
            <input type="checkbox" className="size-5 accent-primary" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
            {AGREEMENT}
          </label>
          <div className="flex gap-2">
            <Button onClick={() => void accept()} disabled={!agreed || saving}>Continuar</Button>
            <Button variant="ghost" onClick={logout}>Sair</Button>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
