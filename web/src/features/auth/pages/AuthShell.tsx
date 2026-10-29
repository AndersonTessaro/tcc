import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="relative mb-8 py-3">
          <svg className="absolute inset-x-0 top-1/2 h-12 w-full -translate-y-1/2 text-primary/25" aria-hidden="true"
            preserveAspectRatio="none" viewBox="0 0 100 48">
            {[2, 13, 24, 35, 46].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="currentColor" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />)}
          </svg>
          <p className="relative text-4xl font-extrabold tracking-tight text-ink">Harmonia</p>
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
