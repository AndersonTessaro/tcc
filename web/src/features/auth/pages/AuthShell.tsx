import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="relative mb-8 flex items-center gap-3 py-3">
          <img src="/logo.svg" alt="" className="h-10 w-10 shrink-0" />
          <p className="relative text-4xl font-extrabold tracking-tight text-ink">Sonetto</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-6">
          <h1 className="text-xl font-bold text-ink">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-ink-muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
