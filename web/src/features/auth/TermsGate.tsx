import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { authService, type Terms } from "./authService";
import { useAuth } from "./useAuth";

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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">Termos de uso</h1>
      <p className="text-ink-muted">Para continuar usando o Sonetto, leia e aceite os termos abaixo.</p>
      {loadError && (
        <div role="alert" className="flex items-center gap-3 text-danger">
          {loadError}
          <Button variant="secondary" size="sm" onClick={load}>Tentar novamente</Button>
        </div>
      )}
      {!terms && !loadError && <p className="text-ink-faint">Carregando...</p>}
      {terms && (
        <>
          <article className="max-h-[55vh] space-y-2 overflow-y-auto rounded-xl border border-line bg-white p-5 text-sm leading-relaxed text-ink">
            {terms.text.split("\n").filter((line) => line.trim()).map((line, index) => line.startsWith("## ")
              ? <h2 key={index} className="pt-2 text-base font-bold">{line.slice(3)}</h2>
              : <p key={index}>{line}</p>)}
          </article>
          <label className="flex items-center gap-3 text-ink">
            <input type="checkbox" className="size-5 accent-primary" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
            {AGREEMENT}
          </label>
          <div className="flex gap-2">
            <Button onClick={() => void accept()} disabled={!agreed || saving}>Continuar</Button>
            <Button variant="ghost" onClick={logout}>Sair</Button>
          </div>
        </>
      )}
    </main>
  );
}
